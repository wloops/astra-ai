## Context

Astra API 当前部署在 `https://astra-api.wlait.com`，前端在 `https://astra.wlait.com`。现状：
- CORS `allow_origins=["*"]` 搭配 `allow_credentials=True`，浏览器会拒绝此组合
- 无任何速率限制，POST /sessions 可被无限调用（每次调用触发 LLM API，产生费用）
- 缺少标准安全响应头

本设计在不大幅改动架构的前提下，以最小成本补齐安全基线。

## Goals / Non-Goals

**Goals:**
- CORS 改为可配置白名单，默认允许前端域名 + 本地开发地址
- 基于 `slowapi` 实现全局限流 + Session 创建端点专用限流
- 增加 `X-Content-Type-Options`、`X-Frame-Options`、`Strict-Transport-Security` 三个标准安全头
- 限流可通过配置关闭（本地开发场景）

**Non-Goals:**
- 不做用户认证/授权（那是另一个独立 change）
- 不做 IP 黑名单或 WAF 级别的防护
- 不引入 Redis 等外部中间件存储限流状态（使用 slowapi 默认的内存存储）
- 不改造 Helm/K8s 部署（目前不涉及）

## Decisions

### D1: 选择 slowapi 而非 fastapi-limiter

- `slowapi` 是 FastAPI 生态最成熟的限流库（基于 `limits` + `redis`/内存后端），社区活跃度远高于 `fastapi-limiter`
- 支持内存存储后端，无需引入 Redis 依赖，适合当前 SQLite 轻量架构
- 提供装饰器 + 中间件两种模式，灵活度好

### D2: 限流策略

| 端点 | 限制 | 说明 |
|------|------|------|
| 全局（所有端点） | 60 req/min | 防止基本滥用 |
| POST /sessions | 10 req/min | LLM 调用成本保护 |
| GET /sessions/{id}/events | 30 req/min | SSE 长连接，限流宽松 |
| 健康检查 GET /health | 不限流 | 监控探针豁免 |

### D3: 安全头选择

| 头 | 值 | 说明 |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | 禁止 MIME 嗅探 |
| `X-Frame-Options` | `DENY` | 禁止被 iframe 嵌入 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | 强制 HTTPS（生产环境生效） |

HSTS 仅在请求为 HTTPS 时返回，本地 HTTP 开发环境自动跳过。

### D4: CORS 配置方式

环境变量 `ASTRA_CORS_ORIGINS`，逗号分隔，默认值 `https://astra.wlait.com,http://localhost:5173,http://127.0.0.1:5173`。不传时 fallback 到 `["*"]` 以保持完全兼容。

## Risks / Trade-offs

- [Risk] 内存存储限流计数器，多 worker 进程时不共享 → **Mitigation**: 当前部署为单 worker (uvicorn 默认)，暂不影响。后续如需多 worker，迁移到 Redis 后端只需改 slowapi 配置。
- [Risk] 限流过严可能影响正常用户 → **Mitigation**: `ASTRA_RATE_LIMIT_ENABLED=false` 可一键关闭，默认 60 req/min 对正常使用足够宽松。
- [Risk] slowapi 增加新依赖，有供应链风险 → **Mitigation**: slowapi 是 PyPI 上稳定维护的库，依赖链短，且仅在生产环境启用。
