## Why

当前后端 MVP 已经具备项目、角色、场景、Session、SSE 和 LangGraph 流程，但前端仍只是根目录 zip 中的静态 demo，无法演示真实前后端闭环。现在需要将现有前端 demo 迁入 `apps/web` 并接入后端 API，使 Astra 能完整演示“发起研讨 → 实时过程 → 结构化结果”的产品路径。

## What Changes

- 将 `Astra-AI-web-main.zip` 中的 React/Vite 前端迁入 `apps/web`，替换当前占位目录。
- 保留现有页面与视觉风格，优先做数据接入和闭环打通，不进行大规模 UI 重构。
- 新增前端 API client，连接后端 REST 接口：项目、角色、场景模板、Session 创建、Session 查询、结果查询。
- 在会议进行页接入 `GET /sessions/{session_id}/events` SSE，按事件流展示阶段推进、Agent 发言、争议识别和完成状态。
- 在发起研讨页使用后端真实项目、场景和角色数据，并在创建 Session 后跳转会议进行页。
- 在会议结果页使用后端 `SessionResult` 数据渲染最终结论、争议、角色观点、风险、待确认问题、行动项和 Markdown 纪要。
- 在根目录补充 `dev:web` 和并发 `dev` 启动脚本，支持一条命令启动前后端。

## Capabilities

### New Capabilities

- `web-demo-session-flow`: 定义前端 demo 迁入 monorepo 后，接入后端 REST/SSE 并完成智能研讨演示闭环的行为。

### Modified Capabilities

- `backend-agent-session`: 前端将依赖既有后端 REST/SSE 契约；本次只补充前端消费这些契约的要求，不改变后端已有接口语义。

## Impact

- 影响 `apps/web` 前端工程结构、依赖和路由数据流。
- 影响根目录 `package.json` 启动脚本。
- 需要前端读取 `VITE_API_BASE_URL`，默认连接本地后端 `http://127.0.0.1:8010`。
- 后端 API 不做破坏性变更；必要时只允许补充 CORS、开发文档或轻量兼容字段。
