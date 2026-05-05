# Astra API

FastAPI 后端 MVP，提供项目上下文、角色、场景模板、智能研讨 Session、SSE 事件流和结构化结果接口。

## 启动

```bash
uv run --project apps/api uvicorn --app-dir apps/api/src astra_api.main:app --reload --host 0.0.0.0 --port 8010
```

## 环境变量

- `ASTRA_DATABASE_URL`: SQLite 连接串，默认 `sqlite:///./data/astra.db`
- `ASTRA_LLM_BASE_URL`: OpenAI-compatible Chat Completions 地址，可选
- `ASTRA_LLM_API_KEY`: 模型 API Key，可选
- `ASTRA_LLM_MODEL`: 单模型名称，默认 `gpt-4o-mini`

如果未配置模型地址和 Key，LLM Gateway 会使用本地确定性 responder，保证研讨流程仍按阶段真实推进。
