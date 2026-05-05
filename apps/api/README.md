# Astra API

FastAPI 后端 MVP，提供项目上下文、角色、场景模板、智能研讨 Session、SSE 事件流和结构化结果接口。

## 启动

```bash
uv run --project apps/api uvicorn --app-dir apps/api/src astra_api.main:app --reload --host 0.0.0.0 --port 8010
```

## 环境变量

- `ASTRA_DATABASE_URL`: SQLite 连接串，默认 `sqlite:///./data/astra.db`。
- `ASTRA_LLM_BASE_URL`: OpenAI-compatible Chat Completions HTTP endpoint，例如 `https://api.openai.com/v1/chat/completions`。未配置时使用本地确定性 fallback。
- `ASTRA_LLM_API_KEY`: 模型 API Key。仅在同时配置 `ASTRA_LLM_BASE_URL` 时启用远程模型。
- `ASTRA_LLM_MODEL`: 单模型名称，默认 `gpt-4o-mini`。

示例 `.env`：

```bash
ASTRA_LLM_BASE_URL=https://api.openai.com/v1/chat/completions
ASTRA_LLM_API_KEY=sk-...
ASTRA_LLM_MODEL=gpt-4o-mini
```

LLM Gateway 会按研讨阶段选择专用 prompt，并要求模型返回 JSON。远程调用失败或返回非 JSON 时，会自动回退到本地确定性 responder，保证研讨流程仍能完成。
