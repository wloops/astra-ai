## 1. SessionHistory 补完

- [x] 1.1 在 SessionHistory 的 `useEffect` 中增加 `listScenarioTemplates()` 调用，缓存场景列表。
- [x] 1.2 列表行中新增"场景"列或通过 tooltip 展示 `scenario_id` 对应的场景名称。
- [x] 1.3 项目 `<select>` 从 `projects` 数组动态填充 `<option>`（含"全部项目"默认项）。
- [x] 1.4 场景 `<select>` 从 `scenarios` 数组动态填充 `<option>`（含"全部场景"默认项）。
- [x] 1.5 搜索 `<input>` 添加 `onChange`，对 session 列表做 `topic.includes(query)` 前端过滤（结合项目/场景筛选）。
- [x] 1.6 项目/场景/搜索联动过滤，任一筛选条件变化时重新计算显示列表。

## 2. EfficiencyOverview 接入真实数据

- [x] 2.1 EfficiencyOverview 接收 `sessions` 和 `projects` props。
- [x] 2.2 图表数据改为从 sessions 按 `created_at` 按日聚合近 7 天数量。
- [x] 2.3 上下文复用率改为从 projects 的 `completeness` 平均值计算。
- [x] 2.4 Dashboard 将 sessions/projects 传入 EfficiencyOverview。

## 3. QuickStart 与 RecommendedSteps

- [x] 3.1 QuickStart 的"查看历史"卡片添加 `<Link to="/session-history">`。
- [x] 3.2 QuickStart 的"管理项目"卡片添加 `<Link to="/project-context">`。
- [x] 3.3 RecommendedSteps 接收 `sessions`/`projects` props，根据完成率展示建议文案。

## 4. ProjectFilters 接通搜索

- [x] 4.1 ProjectFilters 添加 `searchQuery` 和 `onSearchChange` props，搜索框绑定 onChange。
- [x] 4.2 ProjectContext 管理搜索状态，传递给 ProjectFilters 和 ProjectGrid，ProjectGrid 按 `name.includes(query)` 过滤。

## 5. Dead Code 清理

- [x] 5.1 确认 `WorkspaceLeftPanel.tsx`、`WorkspaceCenterPanel.tsx`、`WorkspaceRightPanel.tsx` 零引用后删除。

## 6. 验证

- [x] 6.1 运行 `npm --prefix apps/web run build` 确认编译通过。
- [x] 6.2 运行 `npm run test:api` 确认后端测试无回归。
- [x] 6.3 启动前后端，手动验证所有改动。
- [x] 6.4 运行 `openspec validate complete-remaining-mock-components --strict`。
