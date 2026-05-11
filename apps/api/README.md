# Astra API

`apps/api` 是 Astra AI 的 FastAPI 后端，负责认证、数据持久化、Agent Session 编排、SSE 事件流、模型调用、知识沉淀和任务管理。

## 启动

```bash
uv run --project apps/api uvicorn --app-dir apps/api/src astra_api.main:app --reload --host 0.0.0.0 --port 8010
```

服务启动时会初始化数据库、写入默认项目/角色/场景模板，并异步回填缺失的知识库条目。

## 核心能力

- 认证与安全：支持 `/auth/register`、`/auth/login`、Bearer Token、API Key fallback、基础安全响应头、CORS 配置和可开关限流。
- 基础数据：提供项目、Agent 角色和场景模板的创建、列表与更新接口。
- Session 编排：通过 LangGraph 和 Host Agent 决策循环推进智能研讨，写入阶段、发言、辩论、人审和终态事件。
- SSE 事件流：`GET /sessions/{session_id}/events` 按持久化 `sequence` 输出事件，支持前端断线重连和历史回放。
- 结构化结果：Session 完成后生成 `SessionResult`，包含结论、争议、角色观点、风险、待确认问题、行动项和 Markdown 纪要。
- 模型路由：LLM Gateway 支持默认模型、Profile、Stage/Role 路由和 Session 覆盖，远程异常时可 fallback。
- 知识库：Session 结果自动沉淀为 `KnowledgeEntry`，支持 embedding、语义搜索、文本降级搜索、相似案例和图谱数据。
- 任务管理：行动项可提升为 `Task`，并支持独立 CRUD、项目筛选、状态筛选和优先级管理。

## 主要端点

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET/POST/PUT /projects`
- `GET/POST/PUT /agent-roles`
- `GET/POST/PUT /scenario-templates`
- `GET/POST /sessions`
- `GET /sessions/{session_id}`
- `GET /sessions/{session_id}/events`
- `GET /sessions/{session_id}/result`
- `POST /sessions/{session_id}/human-reviews/{review_id}/respond`
- `POST /sessions/{session_id}/promote-actions`
- `GET /models/profiles`
- `POST /models/test`
- `GET /knowledge/search`
- `GET /knowledge/similar`
- `GET /knowledge/entries`
- `GET /knowledge/graph`
- `GET/POST/PUT/DELETE /tasks`

除健康检查和认证端点外，业务端点默认挂在需要当前用户的 API Router 下。

## 环境变量

后端通过 `pydantic-settings` 读取 `ASTRA_` 前缀环境变量，并支持根目录 `.env` 与 `apps/api/.env`。

```bash
ASTRA_DATABASE_URL=sqlite:///./data/astra.db

ASTRA_API_KEY=<api-key>
ASTRA_JWT_SECRET=<jwt-secret>
ASTRA_ADMIN_PASSWORD=<admin-password>
ASTRA_CORS_ORIGINS=http://127.0.0.1:5173,https://astra.wlait.com
ASTRA_RATE_LIMIT_ENABLED=true

ASTRA_LLM_BASE_URL=https://api.openai.com/v1
ASTRA_LLM_API_KEY=<llm-api-key>
ASTRA_LLM_MODEL=gpt-4o-mini
ASTRA_LLM_TIMEOUT_SECONDS=60

ASTRA_LLM_MODEL_PROFILES='{"default":{"model":"gpt-4o-mini"},"strong":{"model":"gpt-4o"}}'
ASTRA_LLM_STAGE_ROUTING='{"debate":"strong","judge_and_summarize":"strong"}'
ASTRA_LLM_ROLE_ROUTING='{}'

ASTRA_EMBEDDING_BASE_URL=https://api.openai.com/v1
ASTRA_EMBEDDING_API_KEY=<embedding-api-key>
ASTRA_EMBEDDING_MODEL=text-embedding-3-small

ASTRA_EVENT_POLL_INTERVAL_SECONDS=0.5
ASTRA_ORCHESTRATION_MAX_ITERATIONS=20
ASTRA_ORCHESTRATION_NO_PROGRESS_LIMIT=3
ASTRA_ORCHESTRATION_TIMEOUT_SECONDS=600
```

不要提交真实 `.env` 或密钥。生产环境应至少设置 `ASTRA_JWT_SECRET`、`ASTRA_API_KEY` 或明确的登录用户策略。

## LLM 与 embedding 行为

LLM Gateway 会按阶段选择 prompt，并要求模型返回 JSON object。远程模型超时、连接失败或 5xx 会重试后 fallback；401/403/400 等客户端错误会让 Session 进入失败态，便于暴露配置问题。

`ASTRA_LLM_BASE_URL` 可以配置为 OpenAI-compatible `/v1` 或完整 `/chat/completions` 地址。embedding 独立使用 `ASTRA_EMBEDDING_*` 配置；不可用时，知识库会保留条目并使用文本搜索降级。

## 测试

```bash
npm run test:api
```

后端测试覆盖 API、认证与安全、LLM Gateway、模型 Profile、SSE、orchestrator、知识库和任务管理关键路径。
