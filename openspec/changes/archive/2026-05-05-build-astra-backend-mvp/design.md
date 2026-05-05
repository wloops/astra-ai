## Context

Astra 的产品定位是多 Agent 协同编排与任务执行平台。当前 MVP 以「智能研讨」为首个落地场景，核心价值不是普通聊天，而是围绕项目上下文、场景模板、角色 Skill 和阶段化流程，将复杂议题收敛为结构化交付物。

仓库当前未初始化项目结构，因此本次变更需要先建立轻量 monorepo，再实现后端 MVP。前端 demo 压缩包暂不迁移，只保留为后续接入参考。

## Goals / Non-Goals

**Goals:**

- 建立 `apps/api` + `apps/web` 的轻量 monorepo 结构。
- 使用 FastAPI 提供后端 REST API 和 SSE 事件流。
- 使用 SQLModel + SQLite 持久化核心领域对象。
- 使用数据库管理角色 Skill 和场景模板配置。
- 使用 LangGraph 真实逐步执行智能研讨流程。
- 使用 LLM Gateway 封装单模型调用，保留未来路由扩展点。

**Non-Goals:**

- 不迁移或重构现有前端 zip。
- 不实现真实登录、多租户、权限系统或支付系统。
- 不接入完整 RAG、SQLite FTS、pgvector 或 MCP。
- 不做 WebSocket，实时通信只做 SSE。
- 不引入 PostgreSQL。

## Decisions

- **轻量 monorepo**：根目录保留统一脚本，`apps/api` 作为后端应用，`apps/web` 作为前端占位，避免后续迁移时重排目录。
- **后端优先**：当前变更只实现后端 MVP，前端只依赖公开 API/SSE 契约。
- **SQLite 持久化**：MVP 使用本地 SQLite，降低部署和演示成本。
- **数据库化 Registry**：AgentRole 与 ScenarioTemplate 是可配置资产，默认数据通过种子初始化写入数据库。
- **SSE 事件流**：会议进行页只需要服务端单向推送阶段事件，SSE 比 WebSocket 更轻。
- **LangGraph 阶段执行**：每个节点更新 Session 状态并写入 SessionEvent，让执行过程可追踪、可回放。
- **LLM Gateway 单模型**：先使用统一调用入口，后续可在 Gateway 内扩展按角色、阶段和成本进行多模型路由。

## Risks / Trade-offs

- SQLite 适合 MVP，但并发写入能力有限；后续生产部署可迁移 PostgreSQL。
- SSE 简化实时推送，但不适合双向协作；人工介入后续可通过 REST 写入命令事件。
- 未配置真实模型时需要本地确定性 responder 支撑演示；这不替代真实 LLM，只保证流程可运行。
- 当前 `apps/web` 只是占位，前端对接需要后续单独 change。
