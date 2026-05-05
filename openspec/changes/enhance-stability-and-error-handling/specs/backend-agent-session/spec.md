## ADDED Requirements

### Requirement: LLM Gateway 重试与可观测性

LLM Gateway SHALL 对可恢复的远程调用失败进行重试，并记录每次调用的日志。

#### Scenario: 网络超时或服务端错误时自动重试
- **WHEN** `_complete_remote` 遭遇 `httpx.TimeoutException`、`ConnectError` 或 HTTP 5xx 响应
- **THEN** Gateway SHALL 自动重试最多 2 次，间隔 1 秒
- **AND** 重试用尽后 SHALL fallback 到 `_complete_local`

#### Scenario: 鉴权或客户端错误不重试
- **WHEN** `_complete_remote` 收到 HTTP 401/403/4xx 响应
- **THEN** Gateway SHALL 不重试，直接抛出异常
- **AND** Session SHALL 标记为 failed

#### Scenario: 记录调用日志
- **WHEN** Gateway 执行任何 LLM 调用
- **THEN** SHALL 通过 Python logging 记录 stage、role、耗时（毫秒）和结果状态（success/fallback/error）

### Requirement: LLM 超时可配置

LLM Gateway SHALL 支持从环境变量配置调用超时。

#### Scenario: 读取超时配置
- **WHEN** 环境变量 `ASTRA_LLM_TIMEOUT` 存在
- **THEN** Gateway SHALL 使用该值（秒）作为 httpx 超时
- **AND** 未配置时 SHALL 默认 60 秒
