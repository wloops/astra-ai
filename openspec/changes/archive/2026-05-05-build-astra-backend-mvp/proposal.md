## Why

Astra 当前仓库仍是空项目，根目录只有前端 demo 压缩包，缺少可运行的工程骨架、后端 API、数据库模型和 Agent 编排能力。为了让作品集 Demo 从静态前端走向可演示的多 Agent 后端闭环，需要先搭建轻量 monorepo，并优先实现后端 MVP。

本次变更聚焦「智能研讨」场景的后端能力：项目上下文、角色 Skill、场景模板、研讨 Session、SSE 事件流、LangGraph 阶段化执行和结构化结果沉淀。

## What Changes

- 初始化轻量 monorepo，建立 `apps/api` 和 `apps/web` 目录。
- `apps/web` 仅作为占位，不迁移现有 `Astra-AI-web-main.zip`。
- `apps/api` 使用 FastAPI、SQLModel、SQLite、LangGraph 和 SSE 实现后端 MVP。
- 角色 Skill Registry 与 Scenario Registry 使用数据库持久化，并提供默认种子数据。
- 智能研讨流程按 LangGraph 节点真实逐步运行，而不是一次性生成完整结果。
- LLM Gateway 先支持单模型调用，并保留未来多模型路由扩展点。

## Capabilities

### New Capabilities

- `backend-agent-session`: 定义后端项目上下文、角色、场景模板、研讨 Session、SSE 事件流、LangGraph 执行和结构化结果能力。

### Modified Capabilities

- 无。

## Impact

- 新增 OpenSpec change 文档与 spec delta。
- 新增根目录开发脚本，用于启动后端 API。
- 新增 `apps/api` 后端应用。
- 新增 `apps/web` 前端占位说明。
- 引入 Python 依赖：FastAPI、SQLModel、SQLite、LangGraph、Uvicorn、Pydantic Settings、HTTPX。
