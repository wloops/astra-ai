## 1. 数据模型与 Schema（后端）

- [x] 1.1 `models.py` `ScenarioTemplate` 新增 `host_hints: str` 和 `parallel_groups: list[list[str]]` JSON 字段
- [x] 1.2 `models.py` `EventType` 新增 7 个枚举值：`HOST_DECISION`、`STAGE_SKIPPED`、`STAGE_ADDED`、`ROLE_PULLED`、`ROLE_REMOVED`、`PARALLEL_START`、`PARALLEL_COMPLETE`
- [x] 1.3 `models.py` `SessionResult` 新增 `actual_flow: list[str]`、`skipped_stages: list[dict]`、`added_stages: list[dict]` JSON 字段
- [x] 1.4 `schemas.py` 新增 `HostDecision`、`SessionResultRead` 更新（含流程对比字段）

## 2. Host Agent 决策引擎（后端）

- [x] 2.1 `llm_gateway.py` 新增 `host_decision` 阶段 prompt 和 schema（结构化决策 JSON 输出）
- [x] 2.2 `llm_gateway.py` 新增 `host_decide()` 方法：注入场景 hints + 当前状态摘要，返回 HostDecision
- [x] 2.3 `orchestrator.py` 新增 `SessionState` dataclass（替代 TypedDict，持有完整运行时状态）
- [x] 2.4 `orchestrator.py` 实现 `run_agentic_session()` 主循环（while + 决策→执行→记录）

## 3. 阶段执行（后端）

- [x] 3.1 `orchestrator.py` `execute_stage()` 通用阶段执行函数（写入 stage_started/agent_messages/stage_completed）
- [x] 3.2 `orchestrator.py` `execute_parallel()` 并行执行：asyncio.gather 调用所有角色，return_exceptions=True
- [x] 3.3 `orchestrator.py` `execute_ad_hoc_stage()` 执行临时阶段（Host Agent 定义的 stage_name + stage_prompt）
- [x] 3.4 `orchestrator.py` 各阶段事件 payload 含 `model_used` 字段

## 4. 角色动态管理（后端）

- [x] 4.1 `orchestrator.py` `pull_role()` 拉入已有角色（按 role_code 查 AgentRole 表）
- [x] 4.2 `orchestrator.py` `pull_ad_hoc_role()` 拉入临时角色（不持久化，运行时存在）
- [x] 4.3 `orchestrator.py` `remove_role()` 移除角色并写入事件

## 5. 安全边界（后端）

- [x] 5.1 `orchestrator.py` 最大迭代次数检查（MAX_ITERATIONS=20，可通过 settings 覆盖）
- [x] 5.2 `orchestrator.py` 连续无进展检测（3 轮无新产出则 `no_progress` 终止）
- [x] 5.3 `orchestrator.py` 总耗时超限检查（默认 10 分钟，可通过 settings 覆盖）
- [x] 5.4 `orchestrator.py` 强制终止时仍生成部分 SessionResult（不丢已完成产出）

## 6. API 适配（后端）

- [x] 6.1 `main.py` `POST /sessions` 传递场景 host_hints 和 parallel_groups 到 orchestrator
- [x] 6.2 `main.py` `GET /sessions/{id}/result` 返回新增的流程对比字段
- [x] 6.3 `seed.py` 更新默认场景模板添加 `host_hints` 和 `parallel_groups` 示例值

## 7. 前端事件类型与类型定义

- [x] 7.1 `types.ts` `SessionEventType` 新增 7 个事件类型
- [x] 7.2 `types.ts` 新增 `HostDecision`、`SkippedStage`、`AddedStage` 等 interface
- [x] 7.3 `types.ts` `SessionResult` 新增 `actual_flow`、`skipped_stages`、`added_stages`

## 8. 前端 Workspace 适配

- [x] 8.1 Workspace 阶段进度列表改为从事件流动态构建（不再硬编码 9 阶段）
- [x] 8.2 `host_decision` 事件渲染为“主持决策”卡片（含中文决策理由）
- [x] 8.3 `stage_skipped` 事件在进度列表中标记跳过（灰化 + 原因 tooltip）
- [x] 8.4 `stage_added` 事件在进度列表中动态插入新阶段
- [x] 8.5 `role_pulled`/`role_removed` 事件动态更新角色展示区域
- [x] 8.6 Agent 发言卡片显示 `model_used` 标签

## 9. 前端 SessionResult 适配

- [x] 9.1 SessionResult 页新增“研讨流程”区块：实际流程 vs 场景建议流程对比
- [x] 9.2 跳过的阶段灰色标注 + 原因展示
- [x] 9.3 新增的阶段高亮标注

## 10. 测试

- [x] 10.1 `tests/test_orchestrator.py`：Host Agent 循环正常流程（NEXT_STAGE 全链路）
- [x] 10.2 `tests/test_orchestrator.py`：SKIP_STAGE、ADD_STAGE 决策执行
- [x] 10.3 `tests/test_orchestrator.py`：PULL_ROLE（已有角色 + 临时角色）、REMOVE_ROLE
- [x] 10.4 `tests/test_orchestrator.py`：并行执行正确性（asyncio.gather + return_exceptions）
- [x] 10.5 `tests/test_orchestrator.py`：安全终止（max_iterations、no_progress、timeout）
- [x] 10.6 `tests/test_orchestrator.py`：强制终止时部分 SessionResult 完整性
- [x] 10.7 `tests/test_sse.py`：新事件类型推送正确性
- [x] 10.8 前端 Workspace 新事件渲染测试
