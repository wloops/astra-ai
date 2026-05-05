## Why

当前核心演示闭环（发起研讨 → 会议进行 → 结果展示）已接入真实 API，但 Dashboard、SessionHistory、ProjectContext、RoleConfig 四个页面仍全部使用硬编码 mock 数据。用户在这些页面看到的是假数据，无法展示真实产品完整度，也影响演示说服力。

## What Changes

- **Dashboard 接入真实数据**：StatsCards 改为从 `GET /sessions` 和 `GET /projects` 聚合统计；RecentProjects 改为调用 `GET /projects` 取最近 3 条；RecentMeetings 改为调用 `GET /sessions` 取最近 3 条并关联项目名。
- **SessionHistory 接入真实数据**：列表改为调用 `GET /sessions` 获取真实 session 列表并做字段映射；详情面板调用 `GET /sessions/{id}/result` 展示真实结论和关键冲突。
- **ProjectContext 接入真实数据**：ProjectGrid 改为调用 `GET /projects` 展示真实项目列表；实现"新建项目"表单并调用 `POST /projects` 创建项目；统计和分类从列表数据动态聚合。
- **RoleConfig 接入真实数据**：角色列表改为调用 `GET /agent-roles` 展示真实角色数据；场景模板改为调用 `GET /scenario-templates` 展示真实场景；实现"新建角色"表单并调用 `POST /agent-roles`。
- 前端 `apiClient` 补充缺失方法：`listSessions`、`createProject`、`createAgentRole`、`createScenarioTemplate`。
- 前端 `types.ts` 补充缺失类型，各页面做字段名映射（驼峰 ↔ 蛇形）。

## Capabilities

### New Capabilities

无。所有改动限定在现有 `web-demo-session-flow` 范围内。

### Modified Capabilities

- `web-demo-session-flow`: 新增 Dashboard 数据接入、Session 历史列表接入、项目管理接入、角色配置接入的需求规格。

## Impact

- 影响 `apps/web/src/pages/Dashboard.tsx` 及 5 个子组件。
- 影响 `apps/web/src/pages/SessionHistory.tsx`。
- 影响 `apps/web/src/pages/ProjectContext.tsx` 及 3 个子组件。
- 影响 `apps/web/src/pages/RoleConfig.tsx`。
- 影响 `apps/web/src/api/client.ts`（补充 4 个方法）。
- 影响 `apps/web/src/api/types.ts`（补充类型）。
- 后端 API 无需变更（已有接口足够）。
- 页面视觉布局不做大规模重构，保留现有 UI 风格。
