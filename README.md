# Astra AI

多 Agent 协同编排与任务执行平台。

- 前端: Vercel — `https://astra.wlait.com`
- 后端 API: `https://astra-api.wlait.com`

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
ASTRA_LLM_TIMEOUT_SECONDS=60  # 可选，默认 60s
```

未配置时使用本地确定性 fallback，Session 仍可完成。

---

## 部署说明（开源版）

### 架构

```
astra.wlait.com (Vercel CDN, HTTPS)
    └── React SPA，VITE_API_BASE_URL=https://astra-api.wlait.com

astra-api.wlait.com (HTTPS)
    └── FastAPI API 服务
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

### 后端部署（通用）

```bash
# 启动 API（本地/服务器均可按需调整）
uv run --project apps/api uvicorn --app-dir apps/api/src astra_api.main:app --host 0.0.0.0 --port 8010

# 健康检查
curl https://astra-api.wlait.com/health
```

云服务器上的后端更新流程见 [docs/backend-update.md](docs/backend-update.md)。仓库文档只保留通用步骤，不提交真实服务器地址、账号或密钥。

### 安全说明

- 不要在仓库提交任何真实密钥、令牌、私钥、服务器账户或内网地址。
- 生产配置请使用环境变量或密钥管理服务注入。
- 建议将运维细节（主机信息、备份策略、故障处理 SOP）放在私有文档系统中维护。


