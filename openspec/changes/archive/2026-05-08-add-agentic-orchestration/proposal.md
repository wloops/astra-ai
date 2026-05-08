## Why

当前研讨流程是 LangGraph 硬编码的 9 阶段线性流水线——所有场景跑一样的步骤，不管实际是否需要。产品设想中的"Host Agent 主持研讨"从未实现：无法按需跳过阶段、无法动态拉入新角色、无法并行执行独立评审。本次将编排控制权从硬编码图转移给真正的 Host Agent，让场景模板回归"建议指南"的定位。

## What Changes

- **Host Agent 主持循环**：替换硬编码 LangGraph 线性图，改为 Host Agent 驱动的决策循环——每轮评估当前状态，自主决定下一步动作
- **场景模板真正生效**：`ScenarioTemplate.stages` 从展示字段变为 Host Agent 的参考建议，新增 `host_hints` 字段指导主持行为
- **阶段动态决策**：Host Agent 可执行的动作——`NEXT_STAGE`（进入下一建议阶段）、`SKIP_STAGE`（跳过不必要阶段）、`ADD_STAGE`（新增未预设阶段）、`CONCLUDE`（结束研讨）
- **动态角色管理**：Host Agent 可在研讨中途执行 `PULL_ROLE` 拉入新角色，`REMOVE_ROLE` 移除不再需要的角色
- **多角色并行执行**：`independent_review` 等阶段中，非 host 角色并行调用 LLM，而非串行逐个执行
- **安全边界**：最大迭代次数上限（默认 20）、连续无进展检测、超时强制终止
- **前端适配**：Workspace 实时展示 Host Agent 决策（跳过/新增阶段原因），SessionResult 展示实际流程 vs 建议流程对比
- **事件流扩展**：新增 `host_decision`、`role_pulled`、`role_removed`、`stage_skipped`、`stage_added` 事件类型

## Capabilities

### New Capabilities

- `agentic-orchestration`: Host Agent 主持研讨循环、动态阶段决策、角色管理、并行执行、安全边界

### Modified Capabilities

- `backend-agent-session`: 研讨执行引擎从硬编码图变为 Host Agent 驱动循环；阶段执行规格更新
- `web-demo-session-flow`: 工作台事件消费新增 host_decision/role_pulled 等事件渲染

## Impact

- **后端核心改动**: `orchestrator.py`（完全重写——Host Agent 循环替代线性图）、`models.py`（ScenarioTemplate +host_hints/+parallel_groups，EventType 新增枚举值）、`schemas.py`（HostDecision、StageSuggestion schema）
- **后端联动改动**: `main.py`（Session 创建传递场景配置）、`llm_gateway.py`（新增 host_decision 阶段 prompt）
- **前端改动**: `Workspace.tsx`（渲染 Host Agent 决策卡片）、`SessionResult.tsx`（实际 vs 建议流程对比）、`types.ts`（新事件类型）
- **测试**: orchestrator 集成测试全面更新——Host Agent 循环、跳过/新增阶段、角色管理、并行执行、安全边界
- **兼容性**: 现有 Session 数据不受影响；`ScenarioTemplate.stages` 字段语义升级但结构不变
