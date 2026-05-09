## ADDED Requirements

### Requirement: 交叉辩论过程事件

后端 SHALL 在交叉辩论阶段持久化结构化辩论过程事件，使客户端能够通过现有 Session 事件流回放角色交锋、主持人收束和辩论结论。

#### Scenario: 开始交叉辩论
- **WHEN** Host Agent 决策进入 `debate` 阶段
- **THEN** 系统 SHALL 写入 `stage_started` 事件并标记 stage 为 `debate`
- **AND** 系统 SHALL 写入 `debate_started` 事件
- **AND** `debate_started` payload SHALL 包含参与角色、争议焦点和计划轮次

#### Scenario: 写入单轮辩论发言
- **WHEN** 任一参与角色在交叉辩论中产生观点或回应
- **THEN** 系统 SHALL 写入 `debate_round` 事件
- **AND** payload SHALL 包含 `round_index`、`speaker_role_code`、`stance`、`claim`、`model_used` 和 `stage`
- **AND** 当该发言回应另一角色时，payload SHALL 包含 `responds_to_role_code`
- **AND** 当模型提供证据、风险或让步信息时，payload SHALL 保留为结构化字段

#### Scenario: 写入主持人收束
- **WHEN** 主持人在辩论轮次后判断分歧、共识或下一轮焦点
- **THEN** 系统 SHALL 写入 `debate_moderated` 事件
- **AND** payload SHALL 包含主持人判断、已形成共识、未解决分歧和下一步动作

#### Scenario: 完成交叉辩论
- **WHEN** 交叉辩论阶段完成
- **THEN** 系统 SHALL 写入 `debate_completed` 事件
- **AND** payload SHALL 包含辩论摘要、关键分歧、收敛结论和后续裁决输入
- **AND** 系统 SHALL 继续写入 `stage_completed` 事件并标记 stage 为 `debate`

### Requirement: 辩论事件兼容性

后端 SHALL 保持交叉辩论过程事件与现有 `SessionEvent`、SSE、历史 Session 和本地 fallback 行为兼容。

#### Scenario: 通过现有 SSE 推送辩论事件
- **WHEN** 客户端订阅 `GET /sessions/{session_id}/events`
- **THEN** 系统 SHALL 按持久化 `sequence` 顺序推送 `debate_started`、`debate_round`、`debate_moderated` 和 `debate_completed` 事件
- **AND** 事件格式 SHALL 与现有 `SessionEventRead` 响应结构兼容

#### Scenario: 保留旧客户端可读事件
- **WHEN** 系统生成结构化辩论过程事件
- **THEN** 系统 SHALL 保留现有阶段完成和必要的汇总性发言事件
- **AND** 未识别新辩论事件的旧客户端 SHALL 仍可通过 `agent_message`、`conflict_detected` 或 `stage_completed` 理解研讨结果

#### Scenario: 模型不可用时生成确定性辩论过程
- **WHEN** 远程模型不可用或辩论输出无法解析
- **THEN** LLM Gateway SHALL 通过本地 fallback 生成可解析的辩论轮次和主持人收束数据
- **AND** Session SHALL 继续推进到裁决和总结阶段
