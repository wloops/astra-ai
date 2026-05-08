## Context

当前 Astra AI 后端有 15 个 REST 端点完全无鉴权保护。研讨产出的行动项（`SessionResult.actions`）以非结构化 JSON dict 存储，无独立生命周期。本次设计需要同时解决两个问题：

1. 在不引入完整用户系统的情况下建立鉴权基础
2. 将 actions 从研讨结果的附属数据提升为一等公民的 Task 实体

## Goals / Non-Goals

**Goals:**
- 建立可替换的薄鉴权层，保护所有 API 端点
- 定义 Task 数据模型，支持完整 CRUD 和生命周期管理
- 提供研讨结果到任务的批量转换（promote）
- 提供任务看板前端页面（按状态分列、项目筛选）
- 保持向后兼容（未配置 API Key 时所有端点照常工作）

**Non-Goals:**
- 不引入用户注册/登录/多租户隔离
- 不做任务拖拽排序（只用点击改状态）
- 不做任务依赖关系、评论、活动日志
- 不让 Agent 自动执行任务（那是 Phase 3）
- 不改动 LangGraph 工作流

## Decisions

### 1. 鉴权方案：API Key Header 依赖注入

**选择**：FastAPI `Depends(verify_api_key)` 读取 `X-API-Key` header，与 `settings.api_key` 比对。

**备选**：JWT + 用户系统、OAuth2、Bearer token

**理由**：
- 改动量极小（一个 config 项 + 一个 Dependency 函数约 15 行）
- `Depends()` 可全局 apply，不需要逐个端点修改
- 将来替换为 JWT 用户系统时，只需替换 Dependency 实现，业务代码零改动
- 未配置 `ASTRA_API_KEY` 时直接放行，保持开发体验不变

**关键约定**：前端 `apiClient` 在每个请求中自动附带 `X-API-Key` header，通过 `VITE_API_KEY` 环境变量配置。这为未来任何鉴权方案（Cookie、Bearer token 等）预留了统一的 header 约定。

### 2. Task 模型设计

**选择**：新建独立 `Task` 表，与 `SessionResult.actions` 解耦。

```
Task
├── id: str (PK, "task_" + uuid)
├── project_id: str (FK → Project, NOT NULL)
├── source_session_id: str | None (FK → DiscussionSession, nullable)
├── title: str
├── description: str
├── status: TaskStatus (backlog | todo | in_progress | blocked | done | cancelled)
├── priority: TaskPriority (low | medium | high | critical)
├── assignee_role_code: str | None (对应 AgentRole.code)
├── due_date: datetime | None
├── tags: list[str] (JSON)
├── created_at: datetime
├── updated_at: datetime
├── completed_at: datetime | None
```

**备选**：复用 `SessionResult.actions` JSON 字段，不做独立表

**理由**：
- 独立表支持独立 CRUD、按状态查询、按项目筛选
- `source_session_id` 可追溯来源，同时允许手动创建不关联研讨的任务
- `assignee_role_code` 与现有 AgentRole 体系衔接，用户系统上线后可平滑迁移为 `assignee_user_id`
- 状态枚举借鉴看板最佳实践（backlog → todo → in_progress → done），同时支持 blocked/cancelled 异常路径

### 3. Promote 端点设计

**选择**：`POST /sessions/{session_id}/promote-actions`，请求体可选 `{"action_indices": [0, 2]}`（不传则全量转换）。

**幂等策略**：同一 `(source_session_id, title)` 组合不重复创建。若已存在，跳过并返回 `skipped` 列表。

**理由**：
- 用户可能在结果页多次点击"全部转为任务"，必须幂等
- 支持部分转换（用户可能只需要其中几个 action）
- `SessionResult.actions` 是无 schema 的 dict，promote 时按 `{title, owner→assignee_role_code, priority, status}` 映射

### 4. 前端看板架构

**选择**：按 `TaskStatus` 枚举值分列渲染，点击状态标签或下拉切换状态。不做拖拽。

**备选**：react-beautiful-dnd / dnd-kit 实现拖拽

**理由**：
- 拖拽增加的复杂度（库依赖、移动端适配、无障碍）与当前用户规模不匹配
- 点击改状态 + 看板自动重排的体验足够好
- 状态列：`backlog | todo | in_progress | blocked | done`（cancelled 默认折叠，通过筛选可查看）

**组件树**：
```
TaskBoard (page)
├── FilterBar (按项目、优先级、来源筛选)
├── KanbanBoard
│   ├── KanbanColumn (×5 列，对应状态)
│   │   └── TaskCard (×N)
│   └── EmptyState (某列无任务时)
├── TaskDetail (侧边面板 / Dialog)
├── TaskCreateForm (Dialog)
└── PromoteDialog (从 SessionResult 跳转时预填)
```

### 5. 鉴权全局应用策略

**选择**：通过 FastAPI `app.dependencies` 全局 apply，同时 `/health` 显式豁免。

```python
# main.py
app = FastAPI(dependencies=[Depends(verify_api_key)])  # 全局默认
app.dependencies = []  # 清空默认，改为逐路由控制 — 不行，这样太繁琐

# 实际方案：使用 include_router 的路由级 dependencies + health 豁免
```

**最终选择**：在 `app = FastAPI()` 上不加全局依赖，改为每个路由模块统一注入。实际实现中，由于当前所有路由都在 `main.py` 的 `app` 实例上直接注册，最佳方式是：

```python
# 所有需要鉴权的路由统一依赖
from fastapi import Depends

# 将现有路由组织到 router，统一加 dependencies
api_router = APIRouter(dependencies=[Depends(verify_api_key)])
# ... 注册所有端点
app.include_router(api_router)

# /health 在 app 上直接注册，不走 router
@app.get("/health")
async def health(): ...
```

**理由**：全局 `app.dependencies` 对 `/health` 豁免不方便；`APIRouter` 的 `dependencies` 是最干净的方案。

### 6. Task 筛选与分页

**选择**：`GET /tasks?project_id=&status=&priority=&offset=&limit=`，复用现有 `PaginatedResponse`。

**理由**：与现有 `/projects`、`/sessions`、`/agent-roles` 的分页模式一致，前端可复用 `PaginatedResponse<T>` 类型。

## Risks / Trade-offs

- **[API Key 明文传输]**：`X-API-Key` header 在 HTTP 中明文传输。→ 生产已全量 HTTPS（HSTS），风险可控。未来可升级为 Bearer token。
- **[无用户隔离]**：所有通过 API Key 的请求共享全量数据。→ 当前为单用户/小团队场景，这是有意简化。多租户时需要完整用户系统替换。
- **[promote 幂等依赖 title 匹配]**：若 LLM 两次生成完全相同的 action title，第二次 promote 会被跳过。→ 概率极低，且前端会展示 `skipped` 列表供用户确认。
- **[看板无拖拽]**：部分用户可能期望拖拽体验。→ 先上线验证需求，确有必要时再加 dnd-kit。

## Open Questions

- 无需进一步确认。设计中所有决策均已在探索阶段与需求方对齐。
