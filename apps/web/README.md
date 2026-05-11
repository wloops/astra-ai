# Astra Web

`apps/web` 是 Astra AI 的 React + Vite + TypeScript 前端，已接入后端 REST/SSE，提供从登录、发起研讨、实时会议、结果交付到知识库和任务看板的演示闭环。

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

生产环境使用：

```bash
VITE_API_BASE_URL=https://astra-api.wlait.com
```

## 核心接入点

- `src/api/client.ts`：REST client，封装认证、项目、角色、场景、Session、结果、知识库和任务接口。
- `src/api/events.ts`：SSE 订阅封装，消费 `GET /sessions/{session_id}/events`，处理重连、心跳和终态停止。
- `src/api/types.ts`：前端领域类型，包含 Session、事件、知识库、任务和认证类型。
- `src/contexts/AuthContext.tsx`：登录态管理，维护 Bearer Token 并控制受保护路由。

## 已接入页面

- `/login`、`/register`：用户登录和注册。
- `/dashboard`：读取真实项目、Session 和任务数据，展示统计、近期项目、近期会议和推荐步骤。
- `/start-session`：加载真实项目、角色和场景模板，支持相似历史案例提示并创建 Session。
- `/workspace?sessionId=...`：订阅 SSE，展示阶段进度、Agent 发言、模型状态、知识检索、人审确认、交叉辩论和完成/失败状态。
- `/session-result?sessionId=...`：渲染 `SessionResult`、流程对比、Markdown 纪要，并支持将行动项转为任务。
- `/session-history`：展示历史 Session，支持搜索、项目筛选和场景筛选。
- `/project-context`：展示和维护项目上下文。
- `/role-config`：展示和维护 Agent 角色、场景模板。
- `/knowledge-base`：提供知识条目搜索、筛选和知识图谱视图。
- `/task-board`：按状态展示任务看板，支持创建、查看、编辑和状态更新。

未登录时，除 `/login` 和 `/register` 外会跳转到登录页；已登录用户访问登录/注册页会跳转到 Dashboard。

## 实时事件展示

Workspace 通过持久化 SSE 事件重建会议过程。当前可展示的关键事件包括：

- `host_decision`、`stage_started`、`stage_completed`、`stage_skipped`、`stage_added`
- `agent_message_delta`、`agent_message_done`、`agent_message`
- `parallel_start`、`parallel_complete`
- `knowledge_referenced`
- `human_review_requested`、`human_review_resolved`、`human_review_timeout`
- `debate_started`、`debate_round`、`debate_moderated`、`debate_completed`
- `session_completed`、`session_failed`

SSE 断线后会指数退避重连；Session 到达完成或失败终态后停止重连。

## 测试与构建

```bash
npm --prefix apps/web run test
npm --prefix apps/web run typecheck
npm --prefix apps/web run build
```

前端测试覆盖 API client、通用错误展示、Workspace、SessionResult 和 KnowledgeBase 关键路径。
