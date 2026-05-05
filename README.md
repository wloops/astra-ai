# Astra AI

Astra 是一个多 Agent 协同编排与任务执行平台。当前仓库包含 FastAPI 后端 MVP，以及从 `Astra-AI-web-main.zip` 迁入的 React/Vite 前端 demo。

## 目录

- `apps/api`: FastAPI 后端，使用 SQLModel、SQLite、LangGraph 和 SSE。
- `apps/web`: React + Vite + TypeScript 前端 demo，已接入后端 REST/SSE。
- `openspec`: OpenSpec 规格与变更文档。

## 开发启动

先安装依赖：

```bash
npm install
npm --prefix apps/web install
```

只启动 API：

```bash
npm run dev:api
```

只启动 Web：

```bash
npm run dev:web
```

同时启动 API 和 Web：

```bash
npm run dev
```

默认地址：

- API: `http://127.0.0.1:8010`
- Web: `http://127.0.0.1:5173`

## 环境变量

前端通过 `VITE_API_BASE_URL` 配置后端地址，未配置时默认连接 `http://127.0.0.1:8010`。

后端开发脚本默认使用本地 SQLite 数据库，并在启动时写入演示项目、角色和场景模板。

要启用真实 LLM 驱动的 AI 审议能力，在后端运行环境中配置：

```bash
ASTRA_LLM_BASE_URL=https://api.openai.com/v1/chat/completions
ASTRA_LLM_API_KEY=sk-...
ASTRA_LLM_MODEL=gpt-4o-mini
```

`ASTRA_LLM_BASE_URL` 应指向 OpenAI-compatible Chat Completions endpoint。配置 `ASTRA_LLM_BASE_URL` 和 `ASTRA_LLM_API_KEY` 后，后端的 LangGraph 审议阶段会通过 LLM Gateway 调用真实模型；未配置或远程调用失败时会自动使用本地确定性 fallback。

## 验证

```bash
npm --prefix apps/web run build
npm run test:api
npm run validate:openspec
```


