## ADDED Requirements

### Requirement: 人工确认请求

Host Agent SHALL be able to pause a running Session to request human review when a decision requires missing business facts, authorization, or policy interpretation that cannot be safely inferred from existing context.

#### Scenario: 请求人工确认
- **WHEN** Host Agent determines that a question requires human input before the next decision
- **THEN** the system SHALL persist a human review request with question, reason, blocking level, options, timeout, default timeout behavior, and impact
- **AND** the system SHALL update the Session status to `paused`
- **AND** the system SHALL emit a `human_review_requested` event containing the request payload

#### Scenario: 提交人工确认
- **WHEN** the client submits a response for a pending human review request
- **THEN** the system SHALL mark the request as resolved
- **AND** the system SHALL emit a `human_review_resolved` event
- **AND** the system SHALL add the response to the Host Agent context before continuing the Session
- **AND** the system SHALL update the Session status back to `running`

#### Scenario: 拒绝重复响应
- **WHEN** the client submits a response for a resolved or timed-out human review request
- **THEN** the system SHALL reject the response with a conflict error
- **AND** the existing request status SHALL remain unchanged

### Requirement: 人工确认超时

The system SHALL handle human review timeout without leaving the Session permanently paused.

#### Scenario: 普通确认超时后继续研讨
- **WHEN** a pending human review request reaches its timeout and its timeout behavior is `mark_open_question`
- **THEN** the system SHALL mark the request as timed out
- **AND** the system SHALL emit a `human_review_timeout` event
- **AND** the system SHALL add a structured unresolved item to `open_questions`
- **AND** the system SHALL continue the Session with status `running`

#### Scenario: 使用默认保守选项继续
- **WHEN** a pending human review request reaches its timeout and its timeout behavior is `use_default`
- **THEN** the system SHALL record the default answer as the review outcome
- **AND** the system SHALL emit a `human_review_timeout` event that includes the default answer
- **AND** the system SHALL add the default answer to the Host Agent context before continuing

#### Scenario: 关键阻塞确认超时
- **WHEN** a pending human review request reaches its timeout, its blocking level is `critical`, and its timeout behavior is `abort_if_blocking`
- **THEN** the system SHALL stop the Session as failed or safely terminated
- **AND** the system SHALL emit a terminal event that includes the unresolved critical review reason

### Requirement: 待确认问题分类闭环

Host Agent SHALL classify candidate open questions before finalizing the Session so that only unresolved or timed-out items remain in `open_questions`.

#### Scenario: 使用已有上下文解决问题
- **WHEN** a candidate question can be answered from project context, role outputs, knowledge references, or prior human review responses
- **THEN** the system SHALL incorporate the answer into the relevant conclusion, risk, or decision
- **AND** the question SHALL NOT be included in final `open_questions`

#### Scenario: 将非阻塞后续工作转为行动项
- **WHEN** a candidate question describes follow-up execution work instead of a decision blocker
- **THEN** the system SHALL convert it into an action item with owner, priority, and status
- **AND** the question SHALL NOT be included in final `open_questions`

#### Scenario: 保留真正未解决问题
- **WHEN** a candidate question cannot be answered and has no resolved human review response
- **THEN** the system SHALL include it in final `open_questions`
- **AND** the item SHALL include source, blocking level, impact, and unresolved status when that metadata is available

### Requirement: 行动项语义边界

The system SHALL generate action items only for follow-up work that has enough decision context to execute.

#### Scenario: 生成可执行行动项
- **WHEN** `generate_actions` runs after judgement and question classification
- **THEN** each action item SHALL describe a concrete follow-up task
- **AND** each action item SHALL include at least title, owner, priority, and status

#### Scenario: 避免把待决问题当作行动项
- **WHEN** a proposed action depends on an unresolved human review question
- **THEN** the system SHALL either link the action to that unresolved question or keep the item in `open_questions`
- **AND** the system SHALL NOT present it as an unconditional executable action

### Requirement: 人工确认事件兼容性

The backend SHALL expose human review lifecycle events through the existing SSE event stream.

#### Scenario: 推送人工确认生命周期事件
- **WHEN** a human review request is created, resolved, or timed out
- **THEN** `GET /sessions/{session_id}/events` SHALL stream the corresponding event in persisted sequence order
- **AND** existing session completion and failure event behavior SHALL remain compatible

#### Scenario: 查询已暂停 Session
- **WHEN** the client queries a Session paused for human review
- **THEN** the Session response SHALL expose status `paused`
- **AND** the client SHALL be able to recover the pending review request from persisted data or replayed events
