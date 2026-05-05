## Why

经过 11 个归档 change 的开发迭代，Astra AI 已具备完整的演示闭环（发起研讨 → LLM 实时审议 → 结果沉淀）、全部前端页面接入真实 API、SSE 重连与错误处理、29 个自动化测试 + CI。产品已稳定，可以部署到生产服务器供外部访问。

## What Changes

### Docker 化后端
- 编写 `Dockerfile`（python:3.12-slim + uv）和 `docker-compose.yml`。
- 后端容器监听 `127.0.0.1:8010`，SQLite 数据通过 volume 持久化。

### 前端 Vercel 部署
- 通过 Vercel 部署 `apps/web`，自动 HTTPS + 全球 CDN。
- 环境变量 `VITE_API_BASE_URL=https://astra-api.wlait.com`。

### 服务器 Nginx
- 宿主机 Nginx 反向代理 `astra-api.wlait.com` → Docker 容器 `127.0.0.1:8010`。
- certbot HTTPS 放在部署验证通过后补上。

### 非目标
- 不做 HTTPS（部署验证通过后用 certbot 补）。
- 不做 CI/CD 自动部署（先手动验证稳定性）。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-demo-session-flow`: 新增生产环境可访问需求。

## Impact

- 服务器：<REDACTED_HOST_LOGIN>，Debian 12。
- 部署路径：`<REDACTED_PATH>`。
- 前端域名：`astra.wlait.com`。
- 后端域名：`astra-api.wlait.com`。
- 后端端口：8010（仅 localhost）。

