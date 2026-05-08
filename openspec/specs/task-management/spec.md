# task-management Specification

## Purpose

任务生命周期管理系统，将研讨产出的行动项提升为一等公民的 Task 实体，支持独立 CRUD、看板视图和研讨结果一键转任务。

## ADDED Requirements

### Requirement: Task 数据模型

系统 SHALL 持久化 Task 实体，包含标题、描述、状态、优先级、负责人角色、截止日期、来源研讨关联和标签。

#### Scenario: 创建任务
- **WHEN** 客户端提交 title、project_id 和可选的 description/status/priority/assignee_role_code/due_date/tags
- **THEN** 系统 SHALL 持久化该任务并返回完整 Task 对象
- **AND** Task ID SHALL 以 `task_` 为前缀
- **AND** status 默认值 SHALL 为 `todo`
- **AND** priority 默认值 SHALL 为 `medium`

#### Scenario: 任务状态枚举
- **WHEN** 系统创建或更新任务状态
- **THEN** status SHALL 为以下值之一：`backlog`、`todo`、`in_progress`、`blocked`、`done`、`cancelled`

#### Scenario: 任务优先级枚举
- **WHEN** 系统创建或更新任务优先级
- **THEN** priority SHALL 为以下值之一：`low`、`medium`、`high`、`critical`

### Requirement: Task CRUD REST API

系统 SHALL 提供任务的创建、列表、详情、更新、删除 REST 端点。

#### Scenario: 列出任务（分页）
- **WHEN** 客户端请求 `GET /tasks?offset=0&limit=50`
- **THEN** 系统 SHALL 返回分页的任务列表
- **AND** 响应 SHALL 符合 `PaginatedResponse<TaskRead>` 结构
- **AND** 任务 SHALL 按 `updated_at` 降序排列

#### Scenario: 按项目筛选任务
- **WHEN** 客户端请求 `GET /tasks?project_id=<id>`
- **THEN** 系统 SHALL 仅返回归属于该项目的任务

#### Scenario: 按状态筛选任务
- **WHEN** 客户端请求 `GET /tasks?status=in_progress`
- **THEN** 系统 SHALL 仅返回指定状态的任务

#### Scenario: 查询单个任务
- **WHEN** 客户端请求 `GET /tasks/{task_id}`
- **THEN** 系统 SHALL 返回该任务的完整信息
- **AND** 任务不存在时 SHALL 返回 HTTP 404

#### Scenario: 更新任务
- **WHEN** 客户端 PUT `/tasks/{task_id}` 提交更新字段（如 status/priority/assignee_role_code/due_date）
- **THEN** 系统 SHALL 更新任务记录并返回更新后的数据
- **AND** 当 status 更新为 `done` 时 SHALL 自动设置 `completed_at`
- **AND** 任务不存在时 SHALL 返回 404

#### Scenario: 删除任务
- **WHEN** 客户端 DELETE `/tasks/{task_id}`
- **THEN** 系统 SHALL 删除该任务并返回 `{"status": "deleted", "id": "<task_id>"}`
- **AND** 任务不存在时 SHALL 返回 404

### Requirement: 研讨行动项一键转任务

系统 SHALL 提供端点将指定 Session 的 SessionResult 中的 action items 批量转换为 Task。

#### Scenario: 全量转换
- **WHEN** 客户端 POST `/sessions/{session_id}/promote-actions` 且请求体为空或不含 `action_indices`
- **THEN** 系统 SHALL 将 SessionResult.actions 中的所有行动项创建为 Task
- **AND** 返回 `{"created": N, "skipped": M, "tasks": [...]}`

#### Scenario: 部分转换
- **WHEN** 客户端 POST `/sessions/{session_id}/promote-actions` 且请求体含 `{"action_indices": [0, 2]}`
- **THEN** 系统 SHALL 仅转换指定索引的行动项

#### Scenario: 幂等转换
- **WHEN** 同一 Session 的同一 action title 已被转换为 Task
- **THEN** 再次 promote 时 SHALL 跳过该 action
- **AND** 在 `skipped` 列表中记录跳过的项

#### Scenario: Session 不存在或未完成
- **WHEN** 客户端对不存在的 Session 或 status 非 `completed` 的 Session 请求 promote
- **THEN** 系统 SHALL 返回 HTTP 404 或 400

### Requirement: Task 与 Project 关联

每个 Task SHALL 必须归属于一个 Project，系统 SHALL 支持按项目查询任务。

#### Scenario: 按项目列出任务
- **WHEN** 客户端请求 `GET /tasks?project_id=<proj_id>`
- **THEN** 系统 SHALL 返回该项目下的所有任务
- **AND** 支持与 status/priority 筛选项组合使用

### Requirement: 前端任务看板页面

前端 SHALL 提供任务看板页面 `/task-board`，以按状态分列的看板视图展示任务。

#### Scenario: 看板布局
- **WHEN** 用户访问 `/task-board`
- **THEN** 页面 SHALL 按 TaskStatus 枚举值分列展示任务卡片（backlog、todo、in_progress、blocked、done）
- **AND** cancelled 状态的任务 SHALL 默认折叠，可通过筛选查看

#### Scenario: 任务卡片内容
- **WHEN** 看板渲染任务卡片
- **THEN** 卡片 SHALL 展示任务标题、优先级标签（颜色区分）、负责人角色、来源研讨链接（如有）、截止日期

#### Scenario: 按项目筛选看板
- **WHEN** 用户在筛选器中选择特定项目
- **THEN** 看板 SHALL 仅展示该项目的任务
- **AND** 项目下拉 SHALL 从 `GET /projects` 动态填充

#### Scenario: 空看板状态
- **WHEN** 某状态列无任务
- **THEN** 系统 SHALL 展示友好的空列提示

### Requirement: 前端任务详情面板

前端 SHALL 提供任务详情查看和编辑功能。

#### Scenario: 查看任务详情
- **WHEN** 用户点击任务卡片
- **THEN** 前端 SHALL 以侧边面板或 Dialog 展示任务完整信息
- **AND** SHALL 包含编辑入口

#### Scenario: 编辑任务
- **WHEN** 用户在详情面板点击编辑
- **THEN** 前端 SHALL 展示预填当前值的编辑表单
- **AND** 提交时 SHALL 调用 `PUT /tasks/{id}` 更新任务

#### Scenario: 更改任务状态
- **WHEN** 用户在详情面板或卡片上更改任务状态
- **THEN** 前端 SHALL 调用 `PUT /tasks/{id}` 更新状态
- **AND** 看板 SHALL 自动刷新将任务移至对应列

### Requirement: SessionResult 页面"转为任务"入口

前端 SessionResult 页面 SHALL 在行动项表格区域提供"转为任务"操作按钮。

#### Scenario: 单条转为任务
- **WHEN** 用户在 SessionResult 页面点击某条行动项的"转为任务"按钮
- **THEN** 前端 SHALL 调用 `POST /sessions/{session_id}/promote-actions` 仅转换该条
- **AND** 成功后 SHALL 提示用户并提供跳转任务看板的入口

#### Scenario: 全量转为任务
- **WHEN** 用户在 SessionResult 页面点击"全部转为任务"按钮
- **THEN** 前端 SHALL 调用 promote 端点批量转换
- **AND** SHALL 展示转换结果（创建 N 个，跳过 M 个）

### Requirement: Dashboard 任务统计

前端 Dashboard SHALL 在 StatsCards 区域展示任务相关统计。

#### Scenario: 展示任务统计
- **WHEN** Dashboard 页面加载
- **THEN** 前端 SHALL 调用 `GET /tasks` 获取任务数据
- **AND** SHALL 展示进行中任务数和已逾期任务数

#### Scenario: 推荐步骤含任务建议
- **WHEN** 存在 `todo` 或 `in_progress` 状态的任务
- **THEN** RecommendedSteps SHALL 展示"执行待办任务"建议，含任务数量提示

### Requirement: 导航栏任务看板入口

系统 SHALL 在主导航栏中增加任务看板的导航入口。

#### Scenario: 桌面端导航
- **WHEN** 用户在大屏设备上浏览
- **THEN** Navbar SHALL 展示"任务看板"导航项
- **AND** 点击后 SHALL 跳转到 `/task-board`

#### Scenario: 移动端导航
- **WHEN** 用户在移动设备上打开汉堡菜单
- **THEN** 菜单 SHALL 包含"任务看板"项
