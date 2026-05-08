# api-key-auth Specification

## Purpose

基于 `X-API-Key` 请求头的全局 API 鉴权机制，为所有 REST 端点提供最小防护，并为未来用户认证系统预留替换接口。

## ADDED Requirements

### Requirement: 全局 API Key 鉴权

系统 SHALL 通过 FastAPI Dependency 对所有 REST 端点校验 `X-API-Key` 请求头，与 `ASTRA_API_KEY` 环境变量比对。

#### Scenario: 请求携带有效 API Key
- **WHEN** 客户端在 `X-API-Key` 请求头中传递正确的 API Key
- **THEN** 系统 SHALL 正常处理请求并返回业务响应

#### Scenario: 请求携带无效 API Key
- **WHEN** 客户端在 `X-API-Key` 请求头中传递错误的 API Key
- **THEN** 系统 SHALL 返回 HTTP 401 Unauthorized
- **AND** 响应体 SHALL 包含 `{"detail": "Invalid API key"}`

#### Scenario: 请求未携带 API Key header（鉴权已启用）
- **WHEN** `ASTRA_API_KEY` 已配置且客户端请求未包含 `X-API-Key` 请求头
- **THEN** 系统 SHALL 返回 HTTP 401 Unauthorized

### Requirement: 未配置时向后兼容

系统 SHALL 在 `ASTRA_API_KEY` 未设置或为空时跳过鉴权校验，保持现有行为不变。

#### Scenario: 未配置 API Key 时所有请求放行
- **WHEN** 环境变量 `ASTRA_API_KEY` 未设置或为空字符串
- **THEN** 系统 SHALL 不校验 `X-API-Key` 请求头
- **AND** 所有请求 SHALL 正常处理

### Requirement: 健康检查端点豁免

系统 SHALL 对 `GET /health` 端点豁免 API Key 鉴权，确保部署监控和负载均衡健康检查不受影响。

#### Scenario: 健康检查免鉴权
- **WHEN** 客户端请求 `GET /health` 且未携带 `X-API-Key` 请求头（鉴权已启用）
- **THEN** 系统 SHALL 返回 `{"status": "ok"}` 和 HTTP 200

### Requirement: SSE 事件流鉴权

系统 SHALL 对 `GET /sessions/{session_id}/events` SSE 端点同样执行 API Key 校验。

#### Scenario: SSE 订阅携带有效 API Key
- **WHEN** 客户端通过 EventSource 订阅 SSE（无法自定义请求头时，通过 URL query `?api_key=` 传递）
- **THEN** 系统 SHALL 校验 API Key 并建立事件流

#### Scenario: SSE 订阅未携带 API Key
- **WHEN** 鉴权已启用且客户端 SSE 请求未携带有效 API Key
- **THEN** 系统 SHALL 返回 HTTP 401 并关闭连接

### Requirement: 前端自动附带 API Key

前端 apiClient SHALL 在发起每个请求时自动从 `VITE_API_KEY` 环境变量读取 API Key 并附加到 `X-API-Key` 请求头。

#### Scenario: 前端环境变量已配置
- **WHEN** 前端构建或运行时 `VITE_API_KEY` 已设置
- **THEN** 所有 apiClient 请求 SHALL 自动包含 `X-API-Key` 请求头

#### Scenario: 前端环境变量未配置
- **WHEN** `VITE_API_KEY` 未设置或为空
- **THEN** apiClient SHALL 不发送 `X-API-Key` 请求头
- **AND** 请求 SHALL 正常工作（依赖后端也未配置 API Key）
