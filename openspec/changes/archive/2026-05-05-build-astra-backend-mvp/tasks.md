## 1. OpenSpec 与仓库骨架

- [x] 1.1 初始化 OpenSpec。
- [x] 1.2 创建 `build-astra-backend-mvp` change。
- [x] 1.3 创建轻量 monorepo 根目录脚本和说明。
- [x] 1.4 创建 `apps/web` 占位说明，不迁移前端 zip。

## 2. 后端基础设施

- [x] 2.1 创建 `apps/api` Python 项目并使用 `uv` 管理依赖。
- [x] 2.2 创建 FastAPI 应用、配置、数据库初始化和健康检查。
- [x] 2.3 使用 SQLModel 定义项目、角色、场景、Session、事件和结果模型。
- [x] 2.4 提供默认项目、角色和场景模板种子数据。

## 3. API 与事件流

- [x] 3.1 实现项目、角色、场景模板 REST 接口。
- [x] 3.2 实现研讨 Session 创建、查询、列表和结果接口。
- [x] 3.3 实现 `GET /sessions/{session_id}/events` SSE 事件流。
- [x] 3.4 定义并持久化 `session_started`、`stage_started`、`agent_message`、`conflict_detected`、`tool_event`、`stage_completed`、`session_completed`、`session_failed` 事件。

## 4. Agent 编排

- [x] 4.1 实现 LLM Gateway 单模型入口和本地确定性 fallback。
- [x] 4.2 使用 LangGraph 实现智能研讨阶段流。
- [x] 4.3 在每个阶段写入 Session 状态和 SessionEvent。
- [x] 4.4 生成结构化 SessionResult 和 Markdown 纪要。

## 5. 验证

- [x] 5.1 添加后端基础测试。
- [x] 5.2 运行 `uv run --project apps/api pytest`。
- [x] 5.3 运行 `openspec validate build-astra-backend-mvp --strict`。
