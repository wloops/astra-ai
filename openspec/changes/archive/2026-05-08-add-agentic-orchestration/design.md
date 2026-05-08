## Context

当前 `orchestrator.py` 使用 `StateGraph` 硬编码 9 阶段线性图（`build_graph()` 中 `add_edge` 串联）。每个阶段节点调用 LLM Gateway 产出结果后自动进入下一节点，无决策逻辑。`ScenarioTemplate.stages` 字段存在但 orchestrator 完全不读取。

本次将编排控制权交给 Host Agent——一个使用独立 system prompt 的 LLM 调用，在每轮循环中评估状态并输出结构化决策。

## Goals / Non-Goals

**Goals:**
- Host Agent 驱动研讨循环：每轮评估→决策→执行→记录
- ScenarioTemplate.stages 作为建议流程，Host Agent 可偏离
- Host Agent 可执行的动作：NEXT_STAGE、SKIP_STAGE、ADD_STAGE、PULL_ROLE、REMOVE_ROLE、PARALLEL_RUN、CONCLUDE
- 多角色并行执行（同一阶段多个非 host 角色并发调用 LLM）
- 安全终止条件：最大迭代次数、连续无进展检测
- 新增事件类型推送到 SSE

**Non-Goals:**
- 不做自动场景识别（根据议题自动选场景模板）
- Host Agent 不代替 Gateway 的 `_complete_local` fallback 逻辑
- 不做阶段间的条件分支配置（不由模板定义 if/else——那是 Host Agent 的判断职责）
- 不改变 SessionResult 结构

## Decisions

### 1. Host Agent 循环架构

**选择**：异步 `while` 循环替代 `StateGraph`，每轮迭代 = 一次 Host Agent 决策 + 执行。

```
async def run_agentic_session(session_id: str):
    state = await load_initial_state(session_id)
    iteration = 0
    
    while True:
        iteration += 1
        
        # 安全检查
        if iteration > MAX_ITERATIONS:
            await force_terminate(state, "exceeded_max_iterations")
            break
        if is_stale(state):
            await force_terminate(state, "no_progress")
            break
        
        # Host Agent 决策
        decision = await gateway.host_decide(state)
        record_event(HOST_DECISION, payload=decision)
        
        # 执行决策
        match decision.action:
            case "NEXT_STAGE":
                await execute_stage(state, decision.stage)
            case "SKIP_STAGE":
                record_event(STAGE_SKIPPED, payload={"stage": decision.stage, "reason": decision.reason})
            case "ADD_STAGE":
                await execute_ad_hoc_stage(state, decision)
            case "PULL_ROLE":
                await add_role(state, decision.role_code)
            case "REMOVE_ROLE":
                state.roles = [r for r in state.roles if r.code != decision.role_code]
            case "PARALLEL_RUN":
                await execute_parallel(state, decision.stage, decision.roles)
            case "CONCLUDE":
                await finalize_minutes(state)
                break
```

**备选**：继续用 StateGraph 但加条件边

**理由**：StateGraph 适合固定流程图，不适合"Agent 自主决定下一步"的场景。循环 + 结构化决策更直观，且每步决策都作为事件推送给前端，透明度更高。

### 2. Host Agent 决策 Prompt

**选择**：新增 `host_decision` 阶段类型，专用 system prompt 要求 Host Agent 输出结构化决策 JSON。

```json
{
  "action": "NEXT_STAGE | SKIP_STAGE | ADD_STAGE | PULL_ROLE | REMOVE_ROLE | PARALLEL_RUN | CONCLUDE",
  "reason": "决策理由（中文，展示给用户）",
  "stage": "阶段名（NEXT_STAGE/SKIP_STAGE/PARALLEL_RUN 时必填）",
  "stage_name": "新增阶段名（ADD_STAGE 时必填）",
  "stage_prompt": "新增阶段的 system prompt（ADD_STAGE 时必填）",
  "role_code": "角色 code（PULL_ROLE/REMOVE_ROLE 时必填）",
  "role_name": "角色名（PULL_ROLE 且为全新角色时必填）",
  "role_responsibility": "角色职责（PULL_ROLE 且为全新角色时必填）",
  "roles": ["角色 code 列表"]  // PARALLEL_RUN 时
}
```

**关键约束**：Host Agent 的 system prompt 中注入场景模板的 `host_hints` 和当前状态摘要（已完成阶段、已有产出、参与的角色的观点摘要）。

### 3. 场景模板扩展

**选择**：`ScenarioTemplate` 新增两个字段：

```python
host_hints: str = ""
# 给 Host Agent 的指导："这是需求澄清场景。先确认各方理解一致，再评审关键决策点。
#  如果所有角色在独立评审后无重大分歧，可跳过 debate 直接裁决。"

parallel_groups: list[list[str]] = []
# [["product_manager", "backend_architect", "qa_engineer"]]
# 定义可并行执行的阶段组；independent_review 阶段中所有非 host 角色默认并行
```

`stages` 字段继续作为建议阶段列表，Host Agent 以此为基准但可偏离。

### 4. 并行执行

**选择**：使用 `asyncio.gather()` 并行调用多个角色的 `complete_structured()`。

```python
async def execute_parallel(state, stage, role_codes):
    roles = [r for r in state.roles if r.code in role_codes and r.code != "host"]
    tasks = [
        gateway.complete_structured(role=r, stage=stage, ...)
        for r in roles
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    # 处理结果、写入事件
```

**理由**：Gateway 调用是 I/O 密集的（HTTP 请求），异步并行可显著减少总耗时。LangGraph 的 `Send` API 也可做并行，但考虑到放弃了 StateGraph，直接用 `asyncio.gather` 更直接。

### 5. 安全终止

```
┌─────────────────────────────────────┐
│  终止条件（任一触发即结束）           │
│                                     │
│  1. Host Agent 决定 CONCLUDE         │
│  2. 迭代次数 > MAX_ITERATIONS (20)  │
│  3. 连续 3 轮无实质进展               │
│     （无新 agent_message、新阶段      │
│       完成、新角色加入）              │
│  4. 总耗时 > 10 分钟（可配置）        │
└─────────────────────────────────────┘
```

异常终止时生成部分结果——已完成的阶段产出不丢失。

### 6. 事件类型扩展

```python
class EventType(StrEnum):
    # ... 现有类型
    HOST_DECISION = "host_decision"      # Host Agent 每轮决策
    STAGE_SKIPPED = "stage_skipped"      # 阶段被跳过
    STAGE_ADDED = "stage_added"          # 新增临时阶段
    ROLE_PULLED = "role_pulled"          # 动态拉入角色
    ROLE_REMOVED = "role_removed"        # 移除角色
    PARALLEL_START = "parallel_start"    # 并行执行开始
    PARALLEL_COMPLETE = "parallel_complete"  # 并行执行完成
```

### 7. 状态管理

不再使用 `TypedDict`——用 dataclass 持有完整运行时状态：

```python
@dataclass
class SessionState:
    session_id: str
    project: Project
    scenario: ScenarioTemplate
    roles: list[AgentRole]
    topic: str
    model_overrides: dict[str, str]
    
    # 运行时状态
    completed_stages: list[str]
    current_stage: str | None
    role_outputs: list[dict]
    conflicts: list[dict]
    risks: list[dict]
    open_questions: list[str]
    actions: list[dict]
    final_conclusion: str
    
    # 循环控制
    iteration: int
    last_progress_iteration: int
    host_decision_history: list[dict]
```

### 8. 前端适配

**Workspace 页面**：
- 阶段进度列表不再固定展示 9 个阶段，改为从事件流动态构建
- `host_decision` 事件渲染为"主持决策"卡片（如"主持人判定无需辩论，跳过"）
- `stage_added` 事件在进度列表中动态插入新阶段
- `role_pulled` 事件在角色卡片区域动态新增

**SessionResult 页面**：
- 新增"研讨流程"区块，渲染实际执行路径 vs 场景建议路径的对比
- 视觉上标注跳过的阶段和新增的阶段

## Risks / Trade-offs

- **[Host Agent 判断质量依赖模型]**：若用弱模型做 Host Agent，可能错误跳过关键阶段 → 通过 `host_hints` 和强模型配置（DeepSeek v4 pro）保证决策质量
- **[并行执行时的错误处理]**：某角色调用失败不应阻断其他角色 → `asyncio.gather(return_exceptions=True)`，单个失败记录后继续
- **[迭代次数上限可能截断长研讨]**：20 轮对大多数场景足够（每轮一个阶段，通常 5-8 阶段 + 决策开销），极端场景可配置
- **[场景模板兼容性]**：现有 `stages` 字段直接作为建议列表使用，无需迁移

## Migration Plan

1. 完全重写 `orchestrator.py`——Host Agent 循环
2. 扩展 `models.py`（ScenarioTemplate +2 字段，EventType +6 枚举）
3. 新增 `host_decision` 阶段 prompt 到 `llm_gateway.py`
4. 更新 `main.py` Session 创建逻辑（传递场景配置）
5. 前端 Workspace/SessionResult 适配新事件
6. 运行全量回归测试

回滚策略：新版 `orchestrator.py` 与原版无共享逻辑，回滚时替换文件即可。新事件类型前端兼容（`event.type` 未知时静默忽略）。数据库字段新增（nullable），回滚后不影响现有数据。
