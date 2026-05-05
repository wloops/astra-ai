## ADDED Requirements

### Requirement: Dashboard 图表展示真实趋势

前端 Dashboard 的 EfficiencyOverview SHALL 从后端 API 聚合真实数据展示研讨趋势。

#### Scenario: 展示近 7 天研讨趋势
- **WHEN** Dashboard 页面加载
- **THEN** EfficiencyOverview 图表 SHALL 从 `GET /sessions` 按日聚合近 7 天 session 创建数量
- **AND** SHALL 展示上下文复用率（从 `GET /projects` completeness 平均值计算）

#### Scenario: 无数据时展示占位
- **WHEN** 近 7 天无 session 记录
- **THEN** EfficiencyOverview SHALL 展示"暂无数据"占位状态

### Requirement: SessionHistory 搜索与过滤

前端 SessionHistory SHALL 支持前端搜索和按项目/场景筛选。

#### Scenario: 搜索会议标题
- **WHEN** 用户在搜索框输入关键词
- **THEN** 列表 SHALL 过滤仅显示 topic 包含关键词的 session

#### Scenario: 按项目筛选
- **WHEN** 用户选择特定项目
- **THEN** 列表 SHALL 过滤仅显示该项目的 session
- **AND** 项目下拉框 SHALL 从 `GET /projects` 动态填充选项

#### Scenario: 按场景筛选
- **WHEN** 用户选择特定场景
- **THEN** 列表 SHALL 过滤仅显示该场景的 session
- **AND** 场景下拉框 SHALL 从 `GET /scenario-templates` 动态填充选项

#### Scenario: 展示场景名称
- **WHEN** SessionHistory 列表渲染
- **THEN** SHALL 通过 scenario_id 关联显示对应场景模板名称

### Requirement: QuickStart 导航补完

前端 Dashboard 的 QuickStart SHALL 为所有操作卡片提供可用的路由跳转。

#### Scenario: 查看会议历史
- **WHEN** 用户点击"查看历史"卡片
- **THEN** SHALL 跳转到 `/session-history` 页面

#### Scenario: 管理项目上下文
- **WHEN** 用户点击"管理项目"卡片
- **THEN** SHALL 跳转到 `/project-context` 页面
