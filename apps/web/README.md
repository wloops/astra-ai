# Astra Web

本目录来自根目录 `Astra-AI-web-main.zip` 中的 React/Vite/TypeScript 前端 demo，已迁入 monorepo 并接入 Astra 后端 REST/SSE。

## 启动

```bash
npm --prefix apps/web install
npm --prefix apps/web run dev
```

从仓库根目录也可以运行：

```bash
npm run dev:web
```

Vite 默认监听 `http://127.0.0.1:5173`。

## 后端连接

前端 API client 默认连接：

```text
http://127.0.0.1:8010
```

如需改后端地址，设置：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8010
```

核心接入点：

- `src/api/client.ts`: REST client，封装项目、角色、场景、Session 和结果查询。
- `src/api/events.ts`: SSE 订阅封装，消费 `GET /sessions/{session_id}/events`。
- `src/api/types.ts`: 前端领域类型。

## 已接入页面

- `/start-session`: 加载真实项目、角色和场景模板，并创建 Session。
- `/workspace?sessionId=...`: 订阅 SSE，展示阶段进度、Agent 发言、争议和完成/失败状态。
- `/session-result?sessionId=...`: 查询并渲染真实 SessionResult 和 Markdown 纪要。
