## Context

当前 Astra 前端使用 Tailwind CSS 4，项目已有 shadcn/ui 风格的 Sheet 组件（`components/ui/dialog.tsx` 基于 `@base-ui/react`）。核心问题是两个页面使用了固定像素宽度三栏布局，没有响应式断点。

## Goals / Non-Goals

**Goals:**
- Workspace 三栏在 <1024px 时自动切换为单栏 + 底部 Tab 切换侧栏内容
- RoleConfig 在 <1024px 时左右侧栏折叠，中间主面板占满
- Navbar 在 <768px 时显示汉堡图标，点击展开垂直导航菜单
- 所有交互式按钮和表单控件补充 aria-label / htmlFor
- 不引入新依赖，复用已有 shadcn Sheet 组件

**Non-Goals:**
- 不做完整的移动端设计稿重构（保持现有桌面端设计不变）
- 不做键盘导航的完整无障碍审计（只补 label 和 aria-label）
- 不改动 Landing 页（营销页已有独立响应式）

## Decisions

### D1: 响应式策略选择

采用 **渐进折叠** 而非全部重写：
- `lg` (1024px) 以下：固定侧栏隐藏 → 底部 Tab Bar 切换显示
- `md` (768px) 以上：保持现有桌面布局

**备选方案**：CSS Container Queries 或完全重构为弹性布局 → 工作量过大，放弃。

### D2: 移动端侧栏方案

Workspace 移动端：底部固定 Tab Bar（3 个 tab：进度/上下文/监控），点击切换内容区
RoleConfig 移动端：顶部增加一个 toggle 按钮（角色库/场景模板/详情），点击切换视图

### D3: Navbar 汉堡菜单

```html
<!-- 桌面端 (>md) -->
[Logo] [导航项] ... [搜索] [通知] [头像]

<!-- 移动端 (<=md) -->
[Logo] [汉堡图标]  ← 点击展开 Sheet
  ├ 导航项 (垂直列表)
  ├ 搜索
  └ 用户信息
```

使用 shadcn Sheet 组件（从右侧滑出）。

### D4: 无障碍实施范围

| 组件 | 措施 |
|------|------|
| `<button>` 仅图标无文字 | 添加 `aria-label="xxx"` |
| `<input>` / `<select>` | 关联 `id` + `<label htmlFor>` |
| 导航区 | 添加 `role="navigation"` |
| 表格 | 添加 `role="table"` + th scope |

## Risks / Trade-offs

- [Risk] 移动端布局变化可能影响现有功能的交互流程 → **Mitigation**: 仅改布局容器（flex/grid），不改业务逻辑和 API 调用
- [Risk] 底部 Tab Bar 在部分机型可能被浏览器导航栏遮挡 → **Mitigation**: 使用 `safe-area-inset-bottom` 适配
