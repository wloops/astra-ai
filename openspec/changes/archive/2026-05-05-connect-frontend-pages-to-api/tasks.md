## 1. API Client 与类型扩展

- [x] 1.1 在 `apiClient` 中补充 `listSessions` 方法，调用 `GET /sessions` 并返回 `DiscussionSession[]`。
- [x] 1.2 在 `apiClient` 中补充 `createProject` 方法，调用 `POST /projects`。
- [x] 1.3 在 `apiClient` 中补充 `createAgentRole` 方法，调用 `POST /agent-roles`。
- [x] 1.4 在 `apiClient` 中补充 `createScenarioTemplate` 方法，调用 `POST /scenario-templates`。
- [x] 1.5 在 `types.ts` 中确认/补充 `DiscussionSession`、`SessionResult`、`AgentRole`、`ScenarioTemplate` 等类型定义与后端返回一致。

## 2. Dashboard 接入真实数据

- [x] 2.1 Dashboard 页面添加 `useEffect` 调用 `listProjects()` 和 `listSessions()`，将结果存入 state。
- [x] 2.2 StatsCards 改为从真实数据聚合统计（session 总数、完成数、项目数等），替换 4 个硬编码卡片。
- [x] 2.3 RecentProjects 改为使用 `projects` 数据，按 `updated_at` 排序取前 3 条，映射字段（name→title、description→desc、tags→tag、completeness→百分比）。
- [x] 2.4 RecentMeetings 改为使用 `sessions` 数据，按 `created_at` 排序取前 3 条，关联项目名，映射字段（topic→name、status→中文状态）。

## 3. SessionHistory 接入真实数据

- [x] 3.1 SessionHistory 页面添加 `useEffect` 调用 `listSessions()`，替换 7 条硬编码 mockList。
- [x] 3.2 列表卡片做字段映射：topic→title、status 枚举→中文状态文案、created_at→本地化时间格式。project_id 和 scenario_id 通过列表数据关联展示名称。
- [x] 3.3 详情面板改为调用 `getSessionResult(id)` 展示真实结论、关键争议和参与角色；无结果时显示空状态。
- [x] 3.4 列表为空时展示友好的空状态 UI（替换假分页"共 27 条"等）。

## 4. ProjectContext 接入真实数据

- [x] 4.1 ProjectContext 页面添加 `useEffect` 调用 `listProjects()`，替换 6 条硬编码项目数据。
- [x] 4.2 ProjectGrid 做字段映射：name→title、description→desc、completeness→完整度百分比、tags→标签数组、updated_at→格式化时间。
- [x] 4.3 ProjectsOverview 统计改为从项目列表动态聚合（总数、高完整度项目数等），替换 4 个硬编码统计值。
- [x] 4.4 ProjectSidebar 分类和标签改为从项目数据动态生成。
- [x] 4.5 实现"新建项目"表单对话框：包含 name/description/goal/background 等字段，提交时调用 `createProject()`，成功后刷新列表并关闭对话框。

## 5. RoleConfig 接入真实数据

- [x] 5.1 RoleConfig 页面添加 `useEffect` 调用 `listAgentRoles()`，替换 6 条硬编码 rolesData。
- [x] 5.2 角色卡片做字段映射：name/description/responsibilities/focus_areas→dimensions、tools（字符串数组→{name,icon}对象数组，icon 用默认值）、output_style→styles（单字符串→数组）、can_debate→canDebate、can_use_tools→canUseTools、is_default→isBuiltIn。
- [x] 5.3 RoleConfig 页面添加 `useEffect` 调用 `listScenarioTemplates()`，替换 5 条硬编码 scenesData。
- [x] 5.4 场景卡片做字段映射并通过 `default_role_codes` 关联角色对象；实现角色库/场景模板 Tab 切换。
- [x] 5.5 实现"新建角色"表单对话框：包含 code/name/description/responsibilities/focus_areas/tools/output_style 等字段，提交时调用 `createAgentRole()`，成功后刷新列表。

## 6. 验证

- [x] 6.1 运行 `npm --prefix apps/web run build` 确认前端编译通过。
- [x] 6.2 运行 `npm run test:api` 确认后端测试无回归。
- [x] 6.3 启动前后端，手动验证 4 个页面的数据加载、统计聚合、新建操作和错误状态。
- [x] 6.4 运行 `openspec validate connect-frontend-pages-to-api --strict`。
