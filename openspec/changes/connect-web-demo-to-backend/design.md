## Context

后端 MVP 已经归档并同步为 `backend-agent-session` 主规格，提供 `GET /projects`、`GET /agent-roles`、`GET /scenario-templates`、`POST /sessions`、`GET /sessions/{id}`、`GET /sessions/{id}/events` 和 `GET /sessions/{id}/result`。根目录仍保留 `Astra-AI-web-main.zip`，`apps/web` 当前只是占位目录。

本次变更要把现有前端 demo 迁入 `apps/web`，并尽量少改 UI，把主要精力放在 API/SSE 接入、路由状态传递和演示闭环上。

## Goals / Non-Goals

**Goals:**

- 将 zip 内 React/Vite/TypeScript 前端迁入 `apps/web`。
- 保留现有页面、组件拆分和视觉风格，避免重做设计。
- 增加统一 API client 和 SSE 订阅封装。
- 发起研讨页使用真实项目、角色和场景模板数据。
- 创建 Session 后进入会议进行页，并通过 SSE 展示真实阶段事件。
- 会议结果页读取真实 `SessionResult`。
- 根目录支持 `dev:api`、`dev:web` 和并发 `dev`。

**Non-Goals:**

- 不做登录、权限、多租户或真实用户系统。
- 不做 shadcn/ui 全量替换。
- 不重构后端领域模型或改变后端 API 语义。
- 不接入真实文件上传、RAG、MCP 或 WebSocket。
- 不把所有静态展示页都强制改成真实数据；Dashboard、历史页和配置页可以先做最小真实数据接入或保留降级展示。

## Decisions

- **迁入而非重建前端**：直接解压并迁入现有 demo，保留可展示资产；替代方案是新建 Vite 项目重写页面，但会拖慢闭环交付。
- **统一 API client**：在前端集中定义 `apiClient`、领域类型和 `VITE_API_BASE_URL` 默认值，避免组件内散落 `fetch` 细节。
- **SSE 使用原生 EventSource**：会议进行页只需要服务端推送，原生 EventSource 足够；替代方案是引入第三方 SSE hook，但当前收益不高。
- **路由传递 Session ID**：创建 Session 后跳转 `/workspace/:sessionId` 或使用 query 参数 `sessionId`。优先 query 参数，改动更小；结果页使用同一 `sessionId` 查询结果。
- **静态数据保底**：当后端不可用或接口失败时，非关键页面可以显示现有静态数据；发起研讨、会议进行和结果页必须清晰展示错误状态，避免假装成功。
- **根目录并发启动**：新增 `dev:web` 和 `dev`，并使用轻量并发工具启动 API 与 Web；如果端口冲突，README 说明默认 API 为 `8010`、Web 为 Vite 默认端口。

## Risks / Trade-offs

- **前端 demo 由 AI Studio 生成，结构可能不完全符合项目风格** → 先最小接入，后续单独 change 做整理和 shadcn/ui 收敛。
- **SSE 事件和现有 Workspace 静态结构不完全匹配** → 建立事件到 UI 消息的 adapter，先覆盖阶段、Agent 发言、争议和完成状态。
- **后端任务可能在页面打开前已完成** → SSE 订阅应从持久化事件顺序读取，页面还应在完成后拉取结果。
- **中文响应在 PowerShell 中可能显示乱码** → 前端浏览器环境按 UTF-8 渲染，开发文档提醒接口响应为 UTF-8 JSON。
- **并发启动增加 Node 依赖** → 仅引入开发依赖，不影响后端运行。
