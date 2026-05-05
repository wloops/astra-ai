## Why

当前项目、角色、场景模板仅支持创建（POST）和读取（GET），不支持更新（PUT）。RoleConfig 和 ProjectContext 页面的"编辑"按钮全部是占位 UI，用户无法修改已有数据。这是 CRUD 链路中最后一环缺失，补完后产品数据管理形成完整闭环。

## What Changes

### 后端新增 API
- `PUT /projects/{project_id}` — 更新项目上下文（名称、描述、目标、背景等）。
- `PUT /agent-roles/{role_id}` — 更新角色配置（名称、职责、关注维度、工具、输出风格等）。
- `PUT /scenario-templates/{scenario_id}` — 更新场景模板（名称、阶段、默认角色、输出结构等）。

### 前端接入
- `apiClient` 补充 `updateProject`、`updateAgentRole`、`updateScenarioTemplate` 方法。
- RoleConfig 页面：编辑角色表单 ← 调用 `updateAgentRole`；编辑场景表单 ← 调用 `updateScenarioTemplate`。
- ProjectContext 页面：编辑项目表单 ← 调用 `updateProject`。

### 非目标
- 不做 DELETE 端点（数据保留用于历史记录关联）。
- 不做 Session 重试 API（需 workflow 状态机重构，另开 change）。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `backend-agent-session`: 新增 PUT 端点更新角色和场景模板。
- `web-demo-session-flow`: RoleConfig 和 ProjectContext 支持编辑更新操作。

## Impact

- 影响 `apps/api/src/astra_api/main.py`（新增 3 个 PUT 端点）。
- 影响 `apps/api/src/astra_api/models.py`（可能需要 update schema）。
- 影响 `apps/web/src/api/client.ts`（新增 3 个更新方法）。
- 影响 `apps/web/src/pages/RoleConfig.tsx`（编辑角色/场景表单）。
- 影响 `apps/web/src/pages/ProjectContext.tsx`（编辑项目表单）。
- API 向后兼容（仅新增端点，不修改现有）。
