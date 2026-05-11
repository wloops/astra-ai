# AGENTS.md

## 默认协作规则

- 默认使用简体中文回复和撰写项目说明。
- 修改前先说明计划改动的文件；涉及风险、数据迁移、部署或行为兼容性时先提醒。
- 保持现有项目结构、命名和代码风格，不做无关重构。
- 涉及逻辑改动时尽量补充或更新测试。
- 编码时同步添加必要注释；复杂逻辑、业务规则、边界条件和兼容性处理需要解释为什么这样做。
- 常规注释也要添加，保持代码可读性；

## Git 规则

- Git 提交按语义分组，不要把无关改动放进同一个 commit。
- 不要使用 `git add .`，只暂存本次明确相关的文件。
- commit message 要简洁准确，并匹配本次改动范围。
- 优先使用 Conventional Commits：`feat`、`fix`、`refactor`、`docs`、`test`、`chore`。
- 每个 commit 都应保持完善而清晰，便于 review。

## 项目定位

- 项目名：Astra AI。
- 产品方向：多 Agent 协同编排与任务执行平台，当前实现重点是智能研讨 Session 的后端编排、前端演示闭环和结构化结果交付。
- 当前仓库是轻量 monorepo：
  - `apps/api`：FastAPI 后端。
  - `apps/web`：React + Vite + TypeScript 前端。
  - `openspec`：规格与变更文档。

## 技术栈

- 后端：
  - Python 3.12+
  - FastAPI
  - SQLModel
  - SQLite
  - LangGraph
  - SSE 事件流
  - `uv` 作为 Python 包管理和运行入口
- 前端：
  - React 19
  - Vite
  - TypeScript
  - React Router
  - Tailwind CSS 4
  - lucide-react
  - Recharts
  - Vitest + Testing Library
- 根目录工具：
  - `npm` 管理 monorepo 级脚本
  - `concurrently` 同时启动前后端
  - OpenSpec 采用 `schema: spec-driven`

## 关键目录

- `apps/api/src/astra_api/main.py`：FastAPI 应用入口，定义 REST API、SSE 输出和生命周期初始化。
- `apps/api/src/astra_api/models.py`：SQLModel 数据模型，包含项目、角色、场景模板、Session、事件和结果。
- `apps/api/src/astra_api/orchestrator.py`：LangGraph 工作流，负责按阶段推进智能研讨。
- `apps/api/src/astra_api/llm_gateway.py`：单模型 LLM Gateway，封装阶段 prompt、JSON 输出解析、重试和本地 fallback。
- `apps/api/src/astra_api/config.py`：后端运行配置，读取 `ASTRA_` 前缀环境变量。
- `apps/api/src/astra_api/seed.py`：默认项目、角色和场景模板初始化。
- `apps/api/tests`：后端 pytest 测试。
- `apps/web/src/App.tsx`：前端路由入口。
- `apps/web/src/api/client.ts`：前端 REST API client。
- `apps/web/src/api/events.ts`：前端 SSE 订阅、重连和心跳逻辑。
- `apps/web/src/pages`：主要页面，包括 Landing、Dashboard、Workspace、ProjectContext、StartSession、RoleConfig、SessionHistory、SessionResult。
- `apps/web/src/components`：页面组件与通用 UI。
- `openspec/specs/backend-agent-session/spec.md`：后端 Agent Session 能力规格。
- `openspec/specs/web-demo-session-flow/spec.md`：前端演示流程与 REST/SSE 接入规格。
- `.github/workflows/ci.yml`：CI，执行后端测试、前端测试、前端构建和 OpenSpec 校验。

## 后端行为概览

- API 启动时会初始化数据库，并通过 `seed_defaults` 写入默认数据。
- 默认数据库为 `sqlite:///./data/astra.db`，可通过 `ASTRA_DATABASE_URL` 覆盖。
- 主要 REST 资源：
  - `GET /health`
  - `GET/POST/PUT /projects`
  - `GET/POST/PUT /agent-roles`
  - `GET/POST/PUT /scenario-templates`
  - `GET/POST /sessions`
  - `GET /sessions/{session_id}`
  - `GET /sessions/{session_id}/result`
  - `GET /sessions/{session_id}/events`
- 创建 Session 后，后端会把 LangGraph 工作流放入后台任务执行。
- Session 工作流阶段顺序：
  1. `init_session`
  2. `load_context`
  3. `clarify_topic`
  4. `independent_review`
  5. `detect_conflict`
  6. `debate`
  7. `judge_and_summarize`
  8. `generate_actions`
  9. `finalize_minutes`
- SSE 事件会从数据库中的 `SessionEvent` 按 `sequence` 顺序输出。
- Session 失败时会把状态标记为 `failed`，并写入 `session_failed` 事件。

## LLM Gateway 约定

- 后端通过统一 `LLMGateway` 调用模型。
- 配置项：
  - `ASTRA_LLM_BASE_URL`
  - `ASTRA_LLM_API_KEY`
  - `ASTRA_LLM_MODEL`，默认 `gpt-4o-mini`
  - `ASTRA_LLM_TIMEOUT`，默认 60 秒
- Gateway 直接调用 OpenAI-compatible Chat Completions HTTP endpoint。
- 当 base URL 只配置到 `/v1` 时，代码会自动补齐 `/chat/completions`。
- 未配置模型或远程调用失败时，Gateway 会走本地确定性 fallback，以保证研讨流程仍可完成。
- HTTP 5xx、超时或连接错误会重试；HTTP 4xx 客户端错误不重试，通常会让 Session 进入失败态。
- 模型输出必须是 JSON object；解析失败会 fallback。

## 前端行为概览

- 默认后端地址来自 `VITE_API_BASE_URL`，未配置时使用 `http://127.0.0.1:8010`。
- 前端路由包括：
  - `/`
  - `/dashboard`
  - `/workspace`
  - `/project-context`
  - `/start-session`
  - `/role-config`
  - `/session-history`
  - `/session-result`
- Dashboard、SessionHistory、ProjectContext、RoleConfig 等页面应优先消费真实后端 API，不应回退到硬编码 mock 作为主要数据源。
- 会话进行页通过 SSE 消费后端事件，前端具备自动重连、心跳检测和终态后停止重连的逻辑。
- 前端组件风格应保持现有设计系统，优先复用已有 `components/ui`、`src/components` 和 `src/api` 工具。

## OpenSpec 规则

- OpenSpec 是本项目规格驱动开发的主要来源。
- 新功能或行为变更应先检查 `openspec/specs/**` 和现有 `openspec/changes/**`。
- 所有 `openspec/changes/**` 下生成或修改的文档默认使用简体中文叙述。
- 保留 OpenSpec 规范关键字英文格式，例如：
  - `## ADDED Requirements`
  - `## MODIFIED Requirements`
  - `## REMOVED Requirements`
  - `### Requirement:`
  - `#### Scenario:`
  - `- **WHEN**`
  - `- **THEN**`
- spec delta 中业务描述使用中文，但模板结构关键字不要翻译，避免 OpenSpec 校验失败。
- 代码示例、文件路径、CLI 命令、API 端点等技术标识保持原文。
- 当前已归档的变更较多，做新规划时不要只看 archive；应以 `openspec/specs/**` 的当前规格为准。

## 常用命令

```bash
npm install
npm --prefix apps/web install
npm run dev
npm run dev:api
npm run dev:web
npm run test:api
npm --prefix apps/web run test
npm --prefix apps/web run build
npm --prefix apps/web run typecheck
npx openspec validate --strict
```

说明：

- `npm run dev` 会同时启动 API 和 Web。
- API 默认端口：`8010`。
- Web 默认端口：`5173`。
- 根目录 `npm run test:api` 使用 `uv run --project apps/api pytest`。
- 根目录 `npm run validate:openspec` 当前脚本指向历史 change `connect-web-demo-to-backend`；CI 使用的是 `npx openspec validate --strict`。需要校验全量规格时优先参考 CI 命令。

## 测试与 CI

- 后端测试位于 `apps/api/tests`，覆盖 API、LLM Gateway、SSE 和 orchestrator 关键路径。
- 前端测试位于 `apps/web/src/**/*.test.ts(x)`，当前覆盖 API client 和通用错误展示等。
- CI 在 push 到 `main` 或 PR 到 `main` 时运行：
  1. 安装 Python 3.12
  2. 安装 `uv`
  3. 安装 Node.js 20
  4. `npm --prefix apps/web ci`
  5. `npm run test:api`
  6. `npm --prefix apps/web run test`
  7. `npm --prefix apps/web run build`
  8. `npx openspec validate --strict`

## 部署信息

- 前端生产站点：`https://astra.wlait.com`。
- 后端 API：`https://astra-api.wlait.com`。
- 前端部署在 Vercel，`apps/web` 是 Root Directory。
- 前端生产环境需要配置 `VITE_API_BASE_URL=https://astra-api.wlait.com`。
- 后端 Docker 暴露 `8010`，`docker-compose.yml` 将容器端口绑定到 `127.0.0.1:8010`。
- 后端数据目录通过 `./data:/app/data` 挂载，默认 SQLite 文件为 `data/astra.db`。

## 当前代码注意事项

- 仓库中部分中文文档或源码注释在当前终端显示为乱码；整理项目信息时应优先以代码结构、配置和可执行规格为准。
- 不要提交 `.env`、日志、`node_modules`、`.venv`、`.pytest_cache`、构建产物或本地数据库。
- `apps/api/.env` 存在本地配置文件，读取时注意不要泄露密钥。
- `Astra-AI-web-main.zip` 是根目录里的压缩包，通常不应参与功能改动。
- 后端 CORS 当前允许所有来源；如果处理生产安全问题，需要单独评估兼容性。
- `record_event` 通过统计已有事件数量生成下一个 `sequence`，并发写入场景需要谨慎评估。
- 前端 SSE 重连依赖调用方按事件 ID 去重；修改事件消费逻辑时要保留终态后停止重连的行为。

## 开发建议

- 后端新增 API 时同步更新：
  - SQLModel 模型或 schema
  - FastAPI route
  - seed 或迁移策略（如涉及默认数据）
  - pytest
  - 前端 `src/api/types.ts` 与 `src/api/client.ts`
  - OpenSpec spec 或 change
- 前端新增数据流时优先复用 `apiClient` 和现有错误展示组件。
- 修改 Session 工作流时要同时检查：
  - `orchestrator.py` 阶段顺序
  - `SessionEvent` 类型
  - SSE 前端消费
  - `SessionResult` 结构
  - 相关 pytest 和 Vitest
- 修改 LLM 行为时要保持本地 fallback 可用，避免模型不可用导致演示闭环完全中断。
- 任何涉及用户输入的改动都要考虑安全性和边界条件，例如：
  - SQL 注入
  - 大输入导致的性能问题
  - 模型输出解析失败
  - 前端展示异常数据
- 代码改动前先检查相关文件和规格，避免遗漏关键依赖。
- 任何改动都要考虑兼容性，尤其是后端 API 和前端数据结构的变更；如果需要破坏性改动，要先在 OpenSpec 中明确说明，并在 PR 描述中提醒。
- 保持代码和文档的清晰一致，避免引入不必要的复杂性或模糊性。
- 任何改动都要考虑用户体验，尤其是在错误处理、加载状态和边界条件方面；确保前端能够优雅地处理各种异常情况。
- 任何涉及模型输出的改动都要考虑输出的稳定性和可解析性；如果模型输出格式发生变化，要确保后端能够正确解析，并且前端能够正确展示。
- 任何改动都要考虑测试覆盖，尤其是关键路径和边界条件；如果改动涉及多个模块，要确保相关模块的测试都得到更新。
- 任何改动都要考虑文档更新，尤其是 OpenSpec 规格和代码注释；确保文档能够准确反映当前实现和预期行为。

<!-- advisor-kit:start -->

## Advisor Kit Execution Rules

You are the Executor when implementing tasks.

### Core Rules

1. Work in small steps.
2. Do not expand scope beyond the current task.
3. Do not introduce new dependencies without approval.
4. Do not perform large refactors unless explicitly requested.
5. After meaningful changes, report changed files and verification steps.

### Stop And Ask Advisor

Stop modifying code and create `ASK_ADVISOR.md` when:

1. The same issue fails after 2 attempts.
2. The fix requires architecture, routing, state management, database, or data model changes.
3. A new dependency seems necessary.
4. More than 5 files need to change.
5. Build/test errors involve multiple modules.
6. The task conflicts with OpenSpec or EXECUTOR_TASK.md.
7. You are unsure which files should be modified.
8. UI judgment requires screenshot comparison.
9. There is risk of data loss, security issue, or breaking existing behavior.

Do not continue guessing or expand the scope.

<!-- advisor-kit:end -->

<!-- relay-kit:start -->

## Relay Kit 执行规则

执行任务时你是 Relay Executor（执行者）。

### 核心规则

1. 小步执行。
2. 不要超出当前任务范围。
3. 未经批准不要引入新依赖。
4. 除非明确要求，不要进行大规模重构。
5. 有意义的变更后，报告变更文件和验证步骤。

### 角色模式

- 默认以 Executor 角色运行
- 收到 `/relay:run` 命令时加载 relay-runner skill
- Advisory 角色（planner/reviewer/fixer）由相应的 `/relay:` 命令触发

### 停止并求助 Relay Advisor

以下情况停止修改代码，创建 `ASK_ADVISOR.md`：

1. 同一问题尝试 2 次后仍失败。
2. 修复涉及架构、路由、状态管理、数据库或数据模型变更。
3. 看起来需要新依赖。
4. 需要修改超过 5 个文件。
5. 构建/测试错误涉及多个模块。
6. 任务与 OpenSpec 或 EXECUTOR_TASK.md 冲突。
7. 不确定应该修改哪些文件。
8. UI 判断需要截图对比。
9. 存在数据丢失、安全问题或破坏现有行为的风险。

不要继续猜测或扩大范围。

<!-- relay-kit:end -->
