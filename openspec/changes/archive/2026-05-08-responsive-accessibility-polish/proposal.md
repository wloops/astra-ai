## Why

Workspace 和 RoleConfig 两个核心页面使用固定像素宽度三栏布局（`w-[320px]`/`w-[360px]`/`min-w-[500px]`），在手机视口下完全不可用。Navbar 在移动端缺少汉堡菜单，导航项直接隐藏而非折叠。此外，全项目 0 个 `aria-label`，大量 `<label>` 缺少 `htmlFor` 关联，屏幕阅读器体验差。

## What Changes

- Workspace + RoleConfig 三栏布局改为移动端可折叠/堆叠式，小屏下侧栏隐藏或切换为底部 Sheet
- Navbar 新增移动端汉堡菜单（点击展开/收起导航项）
- 全项目按钮、图标按钮、表单 input/label 补充 `aria-label` 和 `htmlFor` 关联
- 统一使用已有 shadcn Sheet 组件（避免引入新依赖）

## Capabilities

### New Capabilities

- `responsive-layout`: 核心页面的移动端响应式布局适配
- `accessibility-basics`: 基本无障碍支持 — aria-label、label 关联、焦点管理

### Modified Capabilities

（无）

## Impact

- `apps/web/src/pages/Workspace.tsx`：三栏布局改造，侧栏移动端折叠
- `apps/web/src/pages/RoleConfig.tsx`：三栏布局改造，侧栏移动端折叠
- `apps/web/src/components/dashboard/Navbar.tsx`：新增汉堡菜单
- `apps/web/src/pages/SessionHistory.tsx`：label htmlFor + aria-label
- `apps/web/src/pages/Dashboard.tsx`：label htmlFor + aria-label
- `apps/web/src/components/session/StartSessionForm.tsx`：label htmlFor + aria-label
