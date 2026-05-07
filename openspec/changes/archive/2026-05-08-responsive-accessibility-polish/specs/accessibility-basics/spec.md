## ADDED Requirements

### Requirement: 交互元素文本替代

系统 SHALL 为所有无可见文本的交互式元素提供 `aria-label`，确保屏幕阅读器用户可理解其功能。

#### Scenario: Toolbar 图标按钮
- **WHEN** 渲染仅包含 SVG 图标的操作按钮（如刷新、删除、编辑、导出）
- **THEN** 按钮具有描述其动作的 `aria-label`（如"删除项目"、"导出记录"）

#### Scenario: Dialog 关闭按钮
- **WHEN** 渲染弹窗的关闭按钮
- **THEN** 关闭按钮具有 `aria-label="关闭"`

### Requirement: 表单标签关联

系统 SHALL 确保所有表单控件通过 `id`/`htmlFor` 与标签正确关联。

#### Scenario: StartSessionForm 标签关联
- **WHEN** 渲染发起研讨表单的项目/场景下拉框和议题输入框
- **THEN** 每个控件有唯一 `id`，关联的 `<label>` 有对应的 `htmlFor`

#### Scenario: 搜索输入框标签关联
- **WHEN** 渲染 SessionHistory 的搜索输入框
- **THEN** 搜索 input 具有 `id`，其 `<label>` 通过 `htmlFor` 关联

### Requirement: 导航语义标注

系统 SHALL 使用合适的 ARIA role 标注导航区域。

#### Scenario: 主导航栏
- **WHEN** 渲染页面顶部 Navbar
- **THEN** Navbar 容器具有 `role="navigation"` 和 `aria-label="主导航"`

#### Scenario: 侧边导航
- **WHEN** 渲染页面侧边栏导航
- **THEN** 侧边栏容器具有 `role="navigation"` 和适当的 `aria-label`
