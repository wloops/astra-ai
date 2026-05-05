## 1. Docker 化后端

- [x] 1.1 创建 `Dockerfile`（python:3.12-slim + uv + uvicorn）。
- [x] 1.2 创建 `docker-compose.yml`（api 服务，127.0.0.1:8010，data volume）。
- [x] 1.3 确认 `.dockerignore` 排除 node_modules、.venv、dist、.git。

## 2. 前端 Vercel 部署

- [x] 2.1 创建 `apps/web/vercel.json`（vite framework）+ `.env.production`。
- [ ] 2.2 用户通过 `cd apps/web && vercel --prod` 部署（需浏览器认证）。
- [x] 2.3 `VITE_API_BASE_URL=https://astra-api.wlait.com` 已配置。

## 3. 服务器部署

- [x] 3.1 SSH 到服务器，安装 docker + docker-compose-plugin。
- [x] 3.2 上传代码到 `<REDACTED_PATH>`（scp）。
- [x] 3.3 `docker compose up -d --build` 启动后端。
- [x] 3.4 验证 `curl http://127.0.0.1:8010/health` → `{"status":"ok"}`。

## 4. Nginx 反向代理

- [x] 4.1 安装 nginx。
- [x] 4.2 创建 `/etc/nginx/sites-available/astra-api`（proxy_pass 8010）。
- [x] 4.3 `nginx -t && systemctl reload nginx`。
- [x] 4.4 验证 `curl -H "Host: astra-api.wlait.com" http://127.0.0.1/health` → ok。

## 5. 验证

- [x] 5.1 `curl http://astra-api.wlait.com/health` → `{"status":"ok"}`。
- [x] 5.2 `curl http://astra-api.wlait.com/projects` → 返回项目 JSON。
- [ ] 5.3 前端部署到 Vercel 后验证完整闭环。
- [x] 5.4 `docker compose ps` 确认容器 running。

