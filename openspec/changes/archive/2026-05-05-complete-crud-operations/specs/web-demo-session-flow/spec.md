## ADDED Requirements

### Requirement: 角色编辑与更新

前端 RoleConfig 页面 SHALL 支持编辑已有角色并提交更新。

#### Scenario: 编辑角色
- **WHEN** 用户在角色详情中点击"编辑基础信息"
- **THEN** 前端 SHALL 展示预填当前值的编辑表单
- **AND** 提交时 SHALL 调用 `PUT /agent-roles/{id}` 更新角色
- **AND** 成功后 SHALL 刷新角色列表

### Requirement: 场景模板编辑与更新

前端 RoleConfig 页面 SHALL 支持编辑已有场景模板并提交更新。

#### Scenario: 编辑场景模板
- **WHEN** 用户在场景模板详情中点击编辑
- **THEN** 前端 SHALL 展示预填当前值的编辑表单
- **AND** 提交时 SHALL 调用 `PUT /scenario-templates/{id}` 更新模板

### Requirement: 项目编辑与更新

前端 ProjectContext 页面 SHALL 支持编辑已有项目并提交更新。

#### Scenario: 编辑项目
- **WHEN** 用户在项目卡片上点击编辑
- **THEN** 前端 SHALL 展示预填当前值的编辑表单
- **AND** 提交时 SHALL 调用 `PUT /projects/{id}` 更新项目
- **AND** 成功后 SHALL 刷新项目列表
