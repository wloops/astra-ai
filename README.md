# Astra AI

多 Agent 协同编排与任务执行平台。

- 前端: Vercel — `https://astra.wlait.com`
- 后端 API: `https://astra-api.wlait.com`
- 服务器: `<REDACTED_HOST_LOGIN>`（SSH）

## 目录

- `apps/api`: FastAPI 后端，SQLModel + SQLite + LangGraph + SSE
- `apps/web`: React + Vite + TypeScript 前端
- `openspec`: 规格与变更文档

---

## 本地开发

```bash
npm install
npm --prefix apps/web install
npm run dev          # 同时启动 API(:8010) + Web(:5173)
npm run dev:api      # 仅 API
npm run dev:web      # 仅 Web
```

## 测试

```bash
npm run test:api                # 后端 pytest (22 tests)
npm --prefix apps/web run test  # 前端 vitest (7 tests)
npm --prefix apps/web run build # 前端构建
npm run validate:openspec       # OpenSpec 校验
```

## LLM 配置

```bash
ASTRA_LLM_BASE_URL=https://api.openai.com/v1/chat/completions
ASTRA_LLM_API_KEY=sk-...
ASTRA_LLM_MODEL=gpt-4o-mini
ASTRA_LLM_TIMEOUT=60  # 可选，默认 60s
```

未配置时使用本地确定性 fallback，Session 仍可完成。

---

## 生产部署

### 架构

```
astra.wlait.com (Vercel CDN, HTTPS)
    └── React SPA，VITE_API_BASE_URL=https://astra-api.wlait.com

astra-api.wlait.com (Nginx, HTTPS via Let's Encrypt)
    └── proxy_pass → 127.0.0.1:8010 (Docker 容器)
```

### 前端部署（Vercel）

一键部署，之后 **每次 push 到 main 自动部署**：

1. 在 [Vercel](https://vercel.com) 创建项目，关联 GitHub 仓库
2. 设置 Root Directory: `apps/web`
3. 设置环境变量: `VITE_API_BASE_URL=https://astra-api.wlait.com`
4. 首次部署后，每次 `git push main` 自动触发

也可以命令行手动部署：
```bash
cd apps/web
npx vercel --prod
```

### 后端部署

服务器环境：
- Debian 12, Docker 29.x, Nginx 1.22
- 代码路径: `<REDACTED_PATH>`
- 数据路径: `<REDACTED_PATH>/data/astra.db`（Docker volume）

#### 日常运维

```bash
ssh <REDACTED_HOST_LOGIN>

# 查看容器状态
cd <REDACTED_PATH>
docker compose ps

# 查看日志
docker compose logs -f          # 实时
docker compose logs --tail 100  # 最近 100 行

# 重启
docker compose restart

# 更新代码后重新部署
cd <REDACTED_PATH>
# 先上传新代码（git pull 或 scp）
docker compose up -d --build

# 查看 Nginx 状态
systemctl status nginx
nginx -t && systemctl reload nginx

# 磁盘空间
df -h <REDACTED_PATH>/data
```

#### 启用 HTTPS

```bash
ssh <REDACTED_HOST_LOGIN>
certbot --nginx -d astra-api.wlait.com
# 证书自动续期已内置，无需额外配置
```

#### 备份数据库

```bash
scp <REDACTED_HOST_LOGIN>:<REDACTED_PATH>/data/astra.db ./backup-$(date +%Y%m%d).db
```

#### 查看 API 是否正常

```bash
curl https://astra-api.wlait.com/health
```


