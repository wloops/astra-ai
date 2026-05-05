## ADDED Requirements

### Requirement: Dashboard 展示真实数据

前端 Dashboard SHALL 从后端 API 获取数据并展示真实统计信息，不再使用硬编码 mock 数据。

#### Scenario: 展示统计数据
- **WHEN** Dashboard 页面加载
- **THEN** 前端 SHALL 调用 `GET /sessions` 和 `GET /projects` 获取数据
- **AND** SHALL 从 session 列表中聚合统计（总数、完成数、进行中数等）
- **AND** SHALL 在 StatsCards 中展示聚合后的真实数值

#### Scenario: 展示最近项目
- **WHEN** Dashboard 页面加载
- **THEN** 前端 SHALL 调用 `GET /projects` 并按 `updated_at` 排序取最近若干条
- **AND** SHALL 在 RecentProjects 区域展示项目名称、标签和更新时间

#### Scenario: 展示最近会议
- **WHEN** Dashboard 页面加载
- **THEN** 前端 SHALL 调用 `GET /sessions` 并按 `created_at` 排序取最近若干条
- **AND** SHALL 在 RecentMeetings 区域展示 session 议题、关联项目名和状态

### Requirement: Session 历史列表接入

前端 SessionHistory 页面 SHALL 调用后端 API 获取真实研讨记录列表和详情。

#### Scenario: 展示 Session 列表
- **WHEN** SessionHistory 页面加载
- **THEN** 前端 SHALL 调用 `GET /sessions` 获取 session 列表
- **AND** SHALL 将后端字段映射为 UI 展示字段（topic → title、status 枚举值映射为中文状态、created_at 格式化为本地时间）

#### Scenario: 展示 Session 详情
- **WHEN** 用户点击某个 session 条目
- **THEN** 前端 SHALL 调用 `GET /sessions/{id}/result` 获取结构化结果
- **AND** SHALL 在详情面板渲染最终结论、关键争议和参与角色信息

#### Scenario: Session 列表为空
- **WHEN** 后端返回空 session 列表
- **THEN** 前端 SHALL 展示友好的空状态提示

### Requirement: 项目管理页面接入

前端 ProjectContext 页面 SHALL 调用后端 API 展示真实项目列表并支持创建新项目。

#### Scenario: 展示项目列表
- **WHEN** ProjectContext 页面加载
- **THEN** 前端 SHALL 调用 `GET /projects` 获取项目列表
- **AND** SHALL 将后端字段映射为 UI 展示字段（name → title、completeness → 完整度百分比、updated_at → 格式化时间）

#### Scenario: 项目统计概览
- **WHEN** ProjectContext 页面加载
- **THEN** 前端 SHALL 从项目列表中聚合统计（总数、完整度 ≥80% 的项目数等）
- **AND** SHALL 在 ProjectsOverview 中展示聚合后的数值

#### Scenario: 创建新项目
- **WHEN** 用户在新建项目表单中提交项目名称、目标、背景等信息
- **THEN** 前端 SHALL 调用 `POST /projects` 创建项目
- **AND** SHALL 创建成功后刷新项目列表

#### Scenario: 创建项目失败
- **WHEN** 后端返回错误或网络失败
- **THEN** 前端 SHALL 显示可理解的错误提示
- **AND** SHALL 保留已填写的表单数据

### Requirement: 角色与场景配置页面接入

前端 RoleConfig 页面 SHALL 调用后端 API 展示真实角色和场景模板数据并支持新建角色。

#### Scenario: 展示角色列表
- **WHEN** RoleConfig 页面加载
- **THEN** 前端 SHALL 调用 `GET /agent-roles` 获取角色列表
- **AND** SHALL 将后端字段映射为 UI 展示字段（name/code/description/responsibilities/focus_areas/tools/output_style/can_debate/can_use_tools/is_default）

#### Scenario: 展示场景模板列表
- **WHEN** RoleConfig 页面加载
- **THEN** 前端 SHALL 调用 `GET /scenario-templates` 获取场景模板列表
- **AND** SHALL 将后端字段映射为 UI 展示字段，并通过 `default_role_codes` 关联角色展示

#### Scenario: 创建新角色
- **WHEN** 用户在新建角色表单中提交角色名称、代号、职责等信息
- **THEN** 前端 SHALL 调用 `POST /agent-roles` 创建角色
- **AND** SHALL 创建成功后刷新角色列表

#### Scenario: 创建角色失败
- **WHEN** 后端返回错误或网络失败
- **THEN** 前端 SHALL 显示可理解的错误提示
- **AND** SHALL 保留已填写的表单数据
