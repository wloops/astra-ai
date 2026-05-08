# api-key-auth Specification (Delta)

## Purpose

扩展现有 API Key 鉴权机制，使其与 JWT Bearer Token 共存：JWT 优先，API Key 作为 fallback。

## MODIFIED Requirements

### Requirement: 全局 API Key 鉴权

系统 SHALL 通过 FastAPI Dependency 对所有 REST 端点执行鉴权校验。鉴权优先级为：JWT Bearer Token（`Authorization: Bearer <token>`）优先；若无 Bearer token，则 fallback 到 `X-API-Key` 请求头与 `ASTRA_API_KEY` 环境变量比对。若 `ASTRA_API_KEY` 和 `ASTRA_JWT_SECRET` 均未配置，则跳过鉴权。

#### Scenario: 请求携带有效 JWT Bearer Token
- **WHEN** 客户端在 `Authorization` 请求头中传递有效的 Bearer JWT token
- **THEN** 系统 SHALL 解析 token 提取用户身份
- **AND** SHALL 将 User 对象注入到路由处理函数

#### Scenario: 请求无 Bearer Token 但携带有效 API Key
- **WHEN** 客户端未设置 `Authorization` header 但在 `X-API-Key` header 中传递正确的 API Key
- **THEN** 系统 SHALL fallback 到 API Key 校验
- **AND** SHALL 将请求映射到默认系统用户

#### Scenario: 请求无 Bearer Token 且携带无效 API Key
- **WHEN** 客户端未设置 `Authorization` header 且在 `X-API-Key` header 中传递错误的 API Key
- **THEN** 系统 SHALL 返回 HTTP 401 Unauthorized

#### Scenario: 请求无任何鉴权信息（鉴权已启用）
- **WHEN** `ASTRA_API_KEY` 或 `ASTRA_JWT_SECRET` 已配置且客户端未携带任何鉴权信息
- **THEN** 系统 SHALL 返回 HTTP 401 Unauthorized

### Requirement: 未配置时向后兼容

系统 SHALL 在 `ASTRA_API_KEY` 和 `ASTRA_JWT_SECRET` 均未设置时跳过鉴权校验，保持现有行为不变。

#### Scenario: 未配置任何鉴权时所有请求放行
- **WHEN** 环境变量 `ASTRA_API_KEY` 和 `ASTRA_JWT_SECRET` 均未设置或为空
- **THEN** 系统 SHALL 不校验任何鉴权信息
- **AND** 所有请求 SHALL 正常处理

### Requirement: 健康检查端点豁免

系统 SHALL 对 `GET /health`、`POST /auth/register`、`POST /auth/login` 端点豁免鉴权校验。

#### Scenario: 健康检查免鉴权
- **WHEN** 客户端请求 `GET /health` 且未携带任何鉴权信息
- **THEN** 系统 SHALL 返回 `{"status": "ok"}` 和 HTTP 200

#### Scenario: 注册和登录端点免鉴权
- **WHEN** 客户端请求 `POST /auth/register` 或 `POST /auth/login` 且未携带鉴权信息
- **THEN** 系统 SHALL 正常处理请求，不返回 401

### Requirement: SSE 事件流鉴权

系统 SHALL 对 `GET /sessions/{session_id}/events` SSE 端点执行鉴权。支持通过 URL query param `?token=<jwt>` 传递 JWT（优先），同时兼容 `?api_key=<key>`。

#### Scenario: SSE 订阅携带有效 JWT token
- **WHEN** 客户端通过 EventSource 订阅 URL 包含 `?token=<valid_jwt>`
- **THEN** 系统 SHALL 校验 JWT 并建立事件流

#### Scenario: SSE 订阅携带有效 API Key
- **WHEN** 客户端通过 EventSource 订阅 URL 包含 `?api_key=<valid_key>`
- **THEN** 系统 SHALL 校验 API Key 并建立事件流

#### Scenario: SSE 订阅未携带鉴权信息
- **WHEN** 鉴权已启用且客户端 SSE 请求未携带有效的 token 或 api_key
- **THEN** 系统 SHALL 返回 HTTP 401 并关闭连接

### Requirement: 前端自动附带 API Key

前端 apiClient SHALL 在发起每个请求时自动附带领先的鉴权方式。优先从 AuthContext 读取 JWT token 并设置 `Authorization: Bearer <token>` header；若无 token 则 fallback 到 `X-API-Key` header（从 `VITE_API_KEY` 环境变量读取）。

#### Scenario: 已登录时使用 JWT
- **WHEN** 用户已登录且 token 有效
- **THEN** 所有 apiClient 请求 SHALL 自动包含 `Authorization: Bearer <token>` header
- **AND** SHALL 不发送 `X-API-Key` header

#### Scenario: 未登录但有 API Key 配置
- **WHEN** 用户未登录且 `VITE_API_KEY` 已配置
- **THEN** apiClient SHALL 发送 `X-API-Key` header

#### Scenario: 无任何鉴权配置
- **WHEN** 用户未登录且 `VITE_API_KEY` 未配置
- **THEN** apiClient SHALL 不发送鉴权相关 header
- **AND** 请求 SHALL 正常工作（依赖后端也未配置鉴权）
