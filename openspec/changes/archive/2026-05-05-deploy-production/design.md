## Context

目标服务器 Debian 12，DNS 已生效（astra.wlait.com / astra-api.wlait.com → <REDACTED_HOST>）。

## 架构

```
浏览器 → astra.wlait.com (Vercel CDN)
           └── SPA 静态资源，VITE_API_BASE_URL=https://astra-api.wlait.com

浏览器 → astra-api.wlait.com (服务器 Nginx :80/:443)
           └── proxy_pass http://127.0.0.1:8010 (Docker 容器)
```

## Decisions

### 1. 后端：Docker Compose

**决策**：`Dockerfile` 构建 FastAPI 镜像，`docker-compose.yml` 管理容器。SQLite 数据通过 volume 持久化。

```
Dockerfile: python:3.12-slim + uv + uvicorn
docker-compose.yml:
  api:
    build: .
    ports: ["127.0.0.1:8010:8010"]
    volumes: [./data:/app/data]
    restart: always
```

### 2. 前端：Vercel

**决策**：通过 Vercel CLI 或 GitHub 集成部署 `apps/web`。构建命令 `npm run build`，输出目录 `dist`。环境变量 `VITE_API_BASE_URL=https://astra-api.wlait.com`。

### 3. Nginx：宿主机直接装

**决策**：Nginx 在宿主机运行（不在 Docker 内），方便 certbot 自动续签。仅反向代理 API 请求到 Docker 容器。

### 4. HTTPS：certbot（后续补）

**决策**：先 HTTP 跑通，再用 `certbot --nginx` 一键加 HTTPS。

## Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --project apps/api --frozen
COPY . .
CMD ["uv", "run", "--project", "apps/api", "uvicorn", "--app-dir", "apps/api/src", "astra_api.main:app", "--host", "0.0.0.0", "--port", "8010"]
```

## Vercel 配置

`apps/web/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

