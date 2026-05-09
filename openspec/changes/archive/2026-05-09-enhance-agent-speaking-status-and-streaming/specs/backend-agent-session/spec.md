## ADDED Requirements

### Requirement: 单 Agent 发言流式事件

后端 SHALL 在单 Agent 阶段通过 SSE 写入可增量展示的发言事件，同时保留完整 `agent_message` 事件以兼容旧客户端。

#### Scenario: 单 Agent 阶段产生流式片段
- **WHEN** Host Agent 执行非并行的单 Agent 阶段并获得发言内容
- **THEN** 系统 SHALL 写入一个或多个 `agent_message_delta` 事件
- **AND** 每个 `agent_message_delta` payload SHALL 包含 `message_id`、`delta`、`role_code`、`stage` 和 `model_used`
- **AND** 系统 SHALL 写入 `agent_message_done` 事件标记同一 `message_id` 已完成
- **AND** 系统 SHALL 继续写入完整 `agent_message` 事件

#### Scenario: 并行阶段不产生流式片段
- **WHEN** 系统执行 `PARALLEL_RUN` 或 `independent_review` 并行阶段
- **THEN** 系统 SHALL 写入 `parallel_start` 和 `parallel_complete` 事件
- **AND** 每个角色产出 SHALL 以完整 `agent_message` 写入
- **AND** 系统 SHALL NOT 为该并行阶段写入 `agent_message_delta`
