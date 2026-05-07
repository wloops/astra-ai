## Why

当前 Astra API 缺少基本的安全防护：CORS 允许任意来源、零速率限制（POST /sessions 可被无限调用产生 LLM 费用）、缺少标准安全响应头。这些是生产环境的安全底线，应在对外暴露服务前补齐。

## What Changes

- CORS 从 `allow_origins=["*"]` 改为通过环境变量 `ASTRA_CORS_ORIGINS` 配置白名单，默认值保持兼容
- 新增全局限流中间件（基于 `slowapi`），对 `/sessions` 创建端点施加更严格的速率限制
- 新增安全响应头中间件：`X-Content-Type-Options`、`X-Frame-Options`、`Strict-Transport-Security`
- 新增 `slowapi` 依赖到 `pyproject.toml`

## Capabilities

### New Capabilities

- `api-security`: API 安全防护 — CORS 白名单配置、速率限制、安全响应头

### Modified Capabilities

（无）

## Impact

- `apps/api/src/astra_api/main.py`：CORS 配置改造 + 新增速率限制中间件 + 安全头中间件
- `apps/api/src/astra_api/config.py`：新增 `cors_origins`、`rate_limit_enabled` 配置项
- `apps/api/pyproject.toml`：新增 `slowapi` 依赖
- `apps/api/.env`：新增 `ASTRA_CORS_ORIGINS` 配置（需同步更新 .env.example）
