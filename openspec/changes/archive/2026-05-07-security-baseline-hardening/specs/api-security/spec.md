## ADDED Requirements

### Requirement: CORS 可配置白名单

系统 SHALL 通过 `ASTRA_CORS_ORIGINS` 环境变量配置 CORS 允许的来源列表。未配置时 SHALL fallback 到允许所有来源以保持兼容。

#### Scenario: 配置了白名单时限制来源
- **WHEN** 环境变量 `ASTRA_CORS_ORIGINS=https://astra.wlait.com,http://localhost:5173` 且客户端从 `https://evil.com` 发起跨域请求
- **THEN** 服务器拒绝该请求（不返回 `Access-Control-Allow-Origin`）

#### Scenario: 未配置时允许所有来源
- **WHEN** 环境变量 `ASTRA_CORS_ORIGINS` 未设置或为空
- **THEN** 服务器允许所有来源（`Access-Control-Allow-Origin: *`）

#### Scenario: 白名单中的来源正常通过
- **WHEN** 环境变量 `ASTRA_CORS_ORIGINS=https://astra.wlait.com` 且客户端从 `https://astra.wlait.com` 发起跨域请求
- **THEN** 服务器返回 `Access-Control-Allow-Origin: https://astra.wlait.com`

### Requirement: 全局速率限制

系统 SHALL 对所有 API 端点施加全局速率限制（默认 60 req/min），可通过 `ASTRA_RATE_LIMIT_ENABLED` 环境变量关闭。

#### Scenario: 全局限制生效
- **WHEN** 客户端在 1 分钟内发出超过 60 个请求
- **THEN** 服务器对超出部分返回 HTTP 429 Too Many Requests

#### Scenario: 速率限制可关闭
- **WHEN** 环境变量 `ASTRA_RATE_LIMIT_ENABLED=false`
- **THEN** 所有请求不受速率限制

#### Scenario: 健康检查端点豁免
- **WHEN** 全局速率限制已触发（其他端点返回 429）
- **THEN** GET /health 端点仍然正常返回 200

### Requirement: Session 创建端点专用限流

系统 SHALL 对 POST /sessions 端点施加更严格的速率限制（默认 10 req/min），以保护 LLM API 调用成本。

#### Scenario: Session 创建限流触发
- **WHEN** 客户端在 1 分钟内尝试创建超过 10 个 Session
- **THEN** 服务器返回 HTTP 429 Too Many Requests 及提示信息

#### Scenario: 不同客户端独立计数
- **WHEN** 客户端 A 达到限流上限
- **THEN** 客户端 B 仍可正常创建 Session（基于 IP 的独立计数器）

### Requirement: 安全响应头

系统 SHALL 在每次响应中返回以下安全头：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`（仅 HTTPS 请求时返回）

#### Scenario: HTTP 请求不返回 HSTS
- **WHEN** 客户端通过 HTTP 发送请求
- **THEN** 响应包含 `X-Content-Type-Options` 和 `X-Frame-Options`，但不包含 `Strict-Transport-Security`

#### Scenario: HTTPS 请求返回全部安全头
- **WHEN** 客户端通过 HTTPS 发送请求
- **THEN** 响应包含 `X-Content-Type-Options`、`X-Frame-Options`、`Strict-Transport-Security` 三个安全头
