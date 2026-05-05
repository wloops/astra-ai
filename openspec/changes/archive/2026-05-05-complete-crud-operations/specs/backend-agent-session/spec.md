## ADDED Requirements

### Requirement: 项目上下文更新

后端 SHALL 支持更新已有项目上下文。

#### Scenario: 更新项目
- **WHEN** 客户端 PUT `/projects/{project_id}` 提交更新字段
- **THEN** 后端 SHALL 更新项目记录并返回更新后的数据
- **AND** 项目不存在时 SHALL 返回 404

### Requirement: 角色配置更新

后端 SHALL 支持更新已有 Agent 角色配置。

#### Scenario: 更新角色
- **WHEN** 客户端 PUT `/agent-roles/{role_id}` 提交更新字段
- **THEN** 后端 SHALL 更新角色记录并返回更新后的数据
- **AND** 角色不存在时 SHALL 返回 404

### Requirement: 场景模板更新

后端 SHALL 支持更新已有场景模板。

#### Scenario: 更新场景模板
- **WHEN** 客户端 PUT `/scenario-templates/{scenario_id}` 提交更新字段
- **THEN** 后端 SHALL 更新场景模板记录并返回更新后的数据
- **AND** 场景模板不存在时 SHALL 返回 404
