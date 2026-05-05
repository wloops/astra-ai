## ADDED Requirements

### Requirement: 前端演示可消费契约

后端 SHALL 保持现有 REST 与 SSE 接口可被本地前端 demo 直接消费。

#### Scenario: 本地前端跨端口访问
- **WHEN** 前端从 Vite 开发服务器访问后端 API
- **THEN** 后端 SHALL 允许本地开发环境的跨域请求
- **AND** SHALL 返回 UTF-8 JSON 响应

#### Scenario: 前端订阅已存在事件
- **WHEN** 前端在 Session 已经开始或完成后订阅 `GET /sessions/{session_id}/events`
- **THEN** 后端 SHALL 按持久化顺序返回该 Session 的事件
- **AND** SHALL 在完成或失败后结束事件流

#### Scenario: 前端查询完成结果
- **WHEN** 前端使用完成的 Session ID 请求 `GET /sessions/{session_id}/result`
- **THEN** 后端 SHALL 返回可直接渲染的结构化结果字段
- **AND** SHALL 包含 `final_conclusion`、`key_conflicts`、`role_summaries`、`risks`、`open_questions`、`actions` 和 `markdown_minutes`
