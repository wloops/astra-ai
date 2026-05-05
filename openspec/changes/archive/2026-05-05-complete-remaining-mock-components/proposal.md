## Why

前 4 个归档 change 已将核心演示链路（发起→研讨→结果）和 4 个主要页面接入真实 API，但仍有若干组件使用硬编码 mock 数据或交互功能未接通。这些是"全链路跑通可用"之前的最后一公里：EfficiencyOverview 图表仍为假数据、SessionHistory 过滤和场景名未关联、3 个 workspace 旧组件为死代码。补齐这些可以让产品在任何演示场景下不出现"假数据"。

## What Changes

- **SessionHistory 补完**：关联 scenario 名称（调用 `listScenarioTemplates`）；搜索框接通前端过滤；项目/场景下拉框从 API 动态填充选项。
- **EfficiencyOverview 接入真实数据**：图表改为从 `GET /sessions` 按日聚合 session 数量展示近 7 天趋势；复用率改为从项目 completeness 平均值计算。
- **QuickStart 补充路由**：后两个卡片（查看历史/管理项目）补充 `<Link>` 跳转。
- **RecommendedSteps 数据驱动**：根据实际 session 完成情况和待行动项数量展示真实建议。
- **ProjectFilters 接通搜索**：搜索框添加 onChange 前端过滤。
- **清理 dead code**：删除 `apps/web/src/components/workspace/` 下 3 个未被引用的旧版 mock 组件。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-demo-session-flow`: Dashboard EfficiencyOverview 从 mock 改为真实数据聚合；SessionHistory 过滤和场景关联补完。

## Impact

- 影响 `apps/web/src/components/dashboard/EfficiencyOverview.tsx`。
- 影响 `apps/web/src/components/dashboard/QuickStart.tsx`。
- 影响 `apps/web/src/components/dashboard/RecommendedSteps.tsx`。
- 影响 `apps/web/src/pages/SessionHistory.tsx`。
- 影响 `apps/web/src/components/project-context/ProjectFilters.tsx`。
- 删除 `apps/web/src/components/workspace/WorkspaceLeftPanel.tsx`、`WorkspaceCenterPanel.tsx`、`WorkspaceRightPanel.tsx`。
- 后端无需变更。
