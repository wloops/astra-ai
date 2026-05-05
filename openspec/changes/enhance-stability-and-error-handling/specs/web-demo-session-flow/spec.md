## ADDED Requirements

### Requirement: SSE 断连自动重连

前端 SSE 订阅 SHALL 在连接断开时自动重连，并在重连成功后恢复状态。

#### Scenario: SSE 断连后指数退避重连
- **WHEN** SSE EventSource 触发 onerror
- **THEN** 前端 SHALL 在 1s/2s/4s/8s/16s 间隔后自动重新创建连接
- **AND** SHALL 最多重试 5 次
- **AND** 重试期间 SHALL 展示"重新连接中…"提示

#### Scenario: 重连成功清除错误
- **WHEN** SSE 重连成功（EventSource onopen）
- **THEN** 前端 SHALL 清除"连接不可用"或"重新连接中"的提示
- **AND** SHALL 继续正常展示事件流

#### Scenario: 重连耗尽后停止
- **WHEN** SSE 重连达到最大次数（5 次）仍失败
- **THEN** 前端 SHALL 展示"连接失败，请刷新页面"提示
- **AND** SHALL 停止自动重连

### Requirement: SSE 心跳检测

前端 SHALL 检测 SSE 连接是否处于静默无事件状态。

#### Scenario: 长时间无事件时提示
- **WHEN** SSE 连接建立后超过 30 秒未收到任何事件
- **THEN** 前端 SHALL 展示"连接可能已中断，等待事件…"提示

#### Scenario: 收到事件时清除心跳提示
- **WHEN** SSE 收到新事件
- **THEN** 前端 SHALL 清除心跳超时提示并重置计时器

### Requirement: 列表页 API 失败错误展示

前端列表页 SHALL 在 API 调用失败时展示可感知的错误提示，不再静默失败。

#### Scenario: Dashboard 加载失败
- **WHEN** Dashboard 的 `listProjects` 或 `listSessions` 调用失败
- **THEN** 前端 SHALL 展示红色错误横幅说明加载失败
- **AND** SHALL 提供"重试"按钮重新加载

#### Scenario: SessionHistory 加载失败
- **WHEN** SessionHistory 的 `listSessions` 调用失败
- **THEN** 前端 SHALL 展示错误横幅，不显示空列表

#### Scenario: ProjectContext 加载失败
- **WHEN** ProjectContext 的 `listProjects` 调用失败
- **THEN** 前端 SHALL 展示错误横幅，不显示空列表

#### Scenario: RoleConfig 加载失败
- **WHEN** RoleConfig 的 `listAgentRoles` 或 `listScenarioTemplates` 调用失败
- **THEN** 前端 SHALL 展示错误横幅，不显示空列表
