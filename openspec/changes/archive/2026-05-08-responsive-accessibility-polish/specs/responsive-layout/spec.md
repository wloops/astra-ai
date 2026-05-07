## ADDED Requirements

### Requirement: 页面移动端响应式布局

系统 SHALL 确保 Workspace 和 RoleConfig 页面在 375px 及以上宽度的设备上可用，内容不水平溢出、功能不丢失。

#### Scenario: Workspace 在窄屏折叠侧栏
- **WHEN** 视口宽度小于 1024px 且用户访问 Workspace 页面
- **THEN** 左右侧栏隐藏，中间主内容区占满全宽，底部显示 Tab Bar 可切换侧栏内容

#### Scenario: RoleConfig 在窄屏切换视图
- **WHEN** 视口宽度小于 1024px 且用户访问 RoleConfig 页面
- **THEN** 左右侧栏隐藏，主面板占满全宽，顶部显示视图切换按钮

#### Scenario: 宽屏保持现有布局
- **WHEN** 视口宽度大于等于 1024px
- **THEN** Workspace 和 RoleConfig 保持现有三栏/两栏桌面布局不变

### Requirement: Navbar 移动端汉堡菜单

系统 SHALL 在移动视口提供可展开的汉堡菜单，包含所有桌面端导航项。

#### Scenario: 移动端汉堡菜单展开
- **WHEN** 视口宽度小于 768px 且用户点击 Navbar 的汉堡图标
- **THEN** 从右侧滑出导航面板，包含所有页面链接、搜索入口、用户信息

#### Scenario: 桌面端正常显示导航
- **WHEN** 视口宽度大于等于 768px
- **THEN** 导航项水平排列在 Navbar 中，汉堡图标隐藏

### Requirement: 基本无障碍标注

系统 SHALL 为所有交互式元素提供基本的无障碍标注，确保屏幕阅读器可正常导航。

#### Scenario: 图标按钮有文本替代
- **WHEN** 页面包含仅显示图标的按钮（无可见文本）
- **THEN** 该按钮具有 `aria-label` 属性描述其功能

#### Scenario: 表单控件关联标签
- **WHEN** 页面包含 `<input>`、`<select>` 或 `<textarea>` 控件
- **THEN** 每个控件通过 `id` 与对应的 `<label htmlFor="...">` 关联

#### Scenario: 导航区域有角色标注
- **WHEN** 页面包含主导航和侧边导航区域
- **THEN** 导航容器具有 `role="navigation"` 属性
