## ADDED Requirements

### Requirement: 会议中人工确认弹窗

The meeting workspace SHALL display an interactive human review prompt when the backend requests human confirmation during a running Session.

#### Scenario: 展示人工确认请求
- **WHEN** the frontend receives a `human_review_requested` event
- **THEN** the Workspace page SHALL display a modal or equivalent prominent prompt
- **AND** the prompt SHALL show the question, reason, blocking level, options when present, timeout information, and impact
- **AND** the meeting progress SHALL indicate that the Session is waiting for human review

#### Scenario: 提交人工确认回答
- **WHEN** the user submits an answer for a pending human review request
- **THEN** the frontend SHALL call the human review response endpoint for that request
- **AND** the prompt SHALL move into a submitted or waiting state until the backend emits `human_review_resolved`

#### Scenario: 人工确认请求超时
- **WHEN** the frontend receives a `human_review_timeout` event
- **THEN** the prompt SHALL close or switch to a timed-out state
- **AND** the meeting progress SHALL show that the Session continued using the backend timeout behavior

#### Scenario: 页面刷新后恢复待确认请求
- **WHEN** the Workspace page loads a Session whose status is `paused`
- **THEN** the frontend SHALL recover and display the pending human review request from session data or replayed SSE events

### Requirement: 人工确认事件展示

The meeting workspace SHALL render human review lifecycle events as part of the visible meeting timeline.

#### Scenario: 展示确认请求事件
- **WHEN** a `human_review_requested` event appears in the event stream
- **THEN** the timeline SHALL show that Host Agent requested human input
- **AND** the item SHALL include the request reason and blocking level

#### Scenario: 展示确认完成事件
- **WHEN** a `human_review_resolved` event appears in the event stream
- **THEN** the timeline SHALL show that the user response was accepted
- **AND** later Agent messages SHALL be shown after that confirmation point

#### Scenario: 展示确认超时事件
- **WHEN** a `human_review_timeout` event appears in the event stream
- **THEN** the timeline SHALL show the timeout result
- **AND** the item SHALL indicate whether the question was added to pending confirmation or a default answer was used

### Requirement: 结果页区分问题与行动项

The Session result page SHALL distinguish resolved decisions, unresolved questions, and executable action items.

#### Scenario: 渲染结构化待确认问题
- **WHEN** result `open_questions` contains structured unresolved items
- **THEN** the result page SHALL display each item with question, source, blocking level, impact, and status when available
- **AND** legacy string questions SHALL still render correctly

#### Scenario: 不把已解决问题显示为待确认
- **WHEN** a question was resolved by context, debate, judgement, or human review response
- **THEN** the result page SHALL NOT show it in the pending confirmation list
- **AND** the resolved decision SHALL be visible through final conclusion, risks, role summaries, or minutes

#### Scenario: 渲染可执行行动项
- **WHEN** result `actions` contains action items
- **THEN** the result page SHALL present them as executable follow-up tasks
- **AND** actions that depend on unresolved questions SHALL visibly indicate that dependency if the backend provides it

### Requirement: 人工确认交互失败处理

The frontend SHALL handle human review response failures without losing the current meeting state.

#### Scenario: 响应提交失败
- **WHEN** the human review response endpoint returns an error or the network request fails
- **THEN** the frontend SHALL show an actionable error message
- **AND** the pending prompt SHALL remain available for retry unless the backend has already timed out the request

#### Scenario: 请求已超时后提交
- **WHEN** the user submits an answer after the backend has already timed out the request
- **THEN** the frontend SHALL show that the request is no longer accepting responses
- **AND** the page SHALL continue consuming subsequent Session events
