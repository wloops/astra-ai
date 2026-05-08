## Why

当前 Astra AI 的研讨流程在产出 `SessionResult.actions` 后即终止——行动项仅作为只读数据展示在结果页，无生命周期追踪、无状态管理、无后续闭环。同时，所有 REST API 端点完全无鉴权保护，继续堆砌新端点会放大未来改造债务。本次变更先铺设最小鉴权层，再构建任务管理系统，打通"研讨→决策→行动执行→追踪"的完整产品链路。

## What Changes

- **新增 API Key 薄鉴权层**：通过 `ASTRA_API_KEY` 环境变量配置，所有 REST 端点统一校验 `X-API-Key` 请求头，未配置时向后兼容放行
- **新增 Task 数据模型**：包含标题、描述、状态、优先级、负责人角色、截止日期、来源研讨关联，支持完整生命周期
- **新增 Task CRUD REST API**：支持创建、列表、详情、更新、删除，按项目/状态/优先级筛选和分页
- **新增研讨行动项一键转任务端点**：`POST /sessions/{id}/promote-actions`，将 SessionResult 中的 actions 批量创建为 Task
- **新增任务看板前端页面**：按状态分列的看板视图，展示任务卡片（标题、优先级、负责人、来源研讨、截止日期）
- **前端改造**：SessionResult 页增加"转为任务"按钮，Dashboard 增加任务统计卡片，导航栏增加任务看板入口

## Capabilities

### New Capabilities

- `api-key-auth`: 基于 `X-API-Key` 请求头的全局 API 鉴权，未配置时向后兼容
- `task-management`: 任务生命周期管理，含 CRUD 接口、看板页面、研讨结果一键转任务

### Modified Capabilities

<!-- 本次变更不修改现有规格的行为契约，均为增量添加 -->

## Impact

- **后端新增文件**: Task 模型、schema、seed 数据
- **后端修改文件**: `main.py`（鉴权依赖 + Task 路由 + promote 端点）、`config.py`（`ASTRA_API_KEY` 配置项）
- **前端新增文件**: `TaskBoard` 页面、任务相关组件（`KanbanColumn`, `TaskCard`, `TaskDetail`, `TaskCreateForm`, `PromoteDialog`）
- **前端修改文件**: `App.tsx`（路由）、`client.ts`（API Key header + Task 方法）、`types.ts`（Task 类型）、`Dashboard.tsx`（任务统计）、`SessionResult.tsx`（转任务按钮）、`Navbar.tsx`（导航入口）、`QuickStart.tsx`（快捷入口）
- **测试**: 后端新增 Task CRUD + promote 测试、鉴权中间件测试；前端新增 apiClient Task 方法测试
- **部署**: 生产环境需配置 `ASTRA_API_KEY` 和前端 `VITE_API_KEY`
