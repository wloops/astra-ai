## 1. API Key 鉴权层（后端）

- [x] 1.1 `config.py` 新增 `ASTRA_API_KEY` 配置项（`astra_api_key: str = ""`）
- [x] 1.2 `main.py` 新增 `verify_api_key` FastAPI Dependency 函数
- [x] 1.3 `main.py` 重构路由注册：创建 `APIRouter` 并统一注入 `dependencies=[Depends(verify_api_key)]`
- [x] 1.4 `GET /health` 保持在 app 实例上注册，豁免鉴权
- [x] 1.5 SSE 端点 `GET /sessions/{session_id}/events` 支持通过 query param `?api_key=` 传递鉴权

## 2. Task 模型与 CRUD API（后端）

- [x] 2.1 `models.py` 新增 `TaskStatus`、`TaskPriority` 枚举和 `Task` SQLModel 表
- [x] 2.2 `schemas.py` 新增 `TaskCreate`、`TaskUpdate`、`TaskRead` Pydantic schema
- [x] 2.3 `main.py` 新增 Task REST 端点：`GET /tasks`（分页+筛选）、`GET /tasks/{id}`、`POST /tasks`、`PUT /tasks/{id}`、`DELETE /tasks/{id}`
- [x] 2.4 `seed.py` 新增默认示例任务数据

## 3. 研讨转任务端点（后端）

- [x] 3.1 `schemas.py` 新增 `PromoteRequest`（可选 `action_indices`）和 `PromoteResponse` schema
- [x] 3.2 `main.py` 新增 `POST /sessions/{session_id}/promote-actions` 端点，含幂等逻辑

## 4. API Key 鉴权层（前端）

- [x] 4.1 `client.ts` 新增从 `VITE_API_KEY` 读取并自动附加 `X-API-Key` 请求头
- [x] 4.2 `events.ts` SSE 订阅 URL 支持附带 `api_key` query param

## 5. 前端类型与 API Client（任务）

- [x] 5.1 `types.ts` 新增 `Task`、`TaskStatus`、`TaskPriority`、`TaskCreatePayload`、`PromoteResponse` 类型
- [x] 5.2 `client.ts` 新增 `listTasks`、`getTask`、`createTask`、`updateTask`、`deleteTask`、`promoteActions` 方法

## 6. 任务看板页面

- [x] 6.1 新建 `TaskCard.tsx` 组件（任务卡片：标题、优先级标签、负责人、来源链接、截止日期）
- [x] 6.2 新建 `KanbanColumn.tsx` 组件（按状态分列，渲染 TaskCard 列表，空列提示）
- [x] 6.3 新建 `TaskDetail.tsx` 组件（侧边面板/Dialog：查看详情 + 编辑表单 + 状态切换）
- [x] 6.4 新建 `TaskCreateForm.tsx` 组件（Dialog 表单：标题、描述、项目、优先级、负责人、截止日期）
- [x] 6.5 新建 `PromoteDialog.tsx` 组件（选择要转换的 action，展示转换结果）
- [x] 6.6 新建 `TaskBoard.tsx` 页面（组合以上组件，含筛选器（项目/优先级），调用 API）

## 7. 前端现有页面集成

- [x] 7.1 `App.tsx` 新增 `/task-board` 路由
- [x] 7.2 `Navbar.tsx` 新增"任务看板"导航入口（桌面+移动端汉堡菜单）
- [x] 7.3 `SessionResult.tsx` 行动项区域增加"转为任务"按钮 + PromoteDialog
- [x] 7.4 `Dashboard.tsx` StatsCards 增加任务统计（进行中/已逾期）
- [x] 7.5 `QuickStart.tsx` 增加"任务看板"快捷入口卡片

## 8. 测试

- [x] 8.1 `tests/test_auth.py` 后端鉴权测试（有效/无效/未配置/health 豁免/SSE 鉴权）
- [x] 8.2 `tests/test_tasks.py` 后端 Task CRUD + promote 集成测试
- [x] 8.3 更新已有测试 fixture 包含 API Key
- [x] 8.4 前端 `client.test.ts` 新增 Task API 方法和 promote 方法测试
