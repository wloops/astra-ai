## 1. Navbar 汉堡菜单

- [x] 1.1 在 Navbar 添加 `useState` 控制菜单展开
- [x] 1.2 `<768px` 时显示汉堡图标（lucide `Menu`），隐藏水平导航项
- [x] 1.3 点击汉堡图标从右侧滑出 Sheet 面板，列出所有导航项
- [x] 1.4 Sheet 内导航项点击后关闭菜单 + 跳转

## 2. Workspace 响应式

- [x] 2.1 `<1024px` 时左右侧栏 `hidden`，中间主区 `w-full`
- [x] 2.2 底部添加固定 Tab Bar（进度/上下文/监控），点击切换显示对应侧栏内容
- [x] 2.3 Tab Bar 使用 `safe-area-inset-bottom` 适配刘海屏
- [x] 2.4 宽屏时 Tab Bar 隐藏，恢复现有三栏布局

## 3. RoleConfig 响应式

- [x] 3.1 `<1024px` 时左右侧栏隐藏，主面板 `w-full`
- [x] 3.2 顶栏增加视图切换按钮组（角色库/场景模板/右侧预览），移动端可见
- [x] 3.3 宽屏时恢复现有三栏布局

## 4. 无障碍 — aria-label

- [x] 4.1 SessionHistory: 刷新、导出、删除、查看纪要、再次发起、复制配置按钮加 `aria-label`
- [x] 4.2 Workspace: 查看详情、工具状态图标按钮加 `aria-label`
- [x] 4.3 RoleConfig: 新建/删除/编辑按钮加 `aria-label`
- [x] 4.4 ProjectContext: 新建/导入/编辑/删除按钮加 `aria-label`
- [x] 4.5 Navbar: 通知、用户头像、导航项按钮加 `aria-label`
- [x] 4.6 StartSessionForm: 角色选择卡片加 `aria-label`

## 5. 无障碍 — label 关联

- [x] 5.1 StartSessionForm: 项目/场景/议题控件加 `id`，对应 `<label>` 加 `htmlFor`
- [x] 5.2 SessionHistory: 搜索 input + 项目/场景 filter 加 `id`/`htmlFor` 关联
- [x] 5.3 Dashboard: 如有搜索/filter 控件加关联
- [x] 5.4 Navbar: 导航容器加 `role="navigation"` + `aria-label`

## 6. 验证

- [x] 6.1 `npm --prefix apps/web run typecheck` 无报错
- [x] 6.2 `npm --prefix apps/web run build` 构建成功
- [x] 6.3 浏览器 DevTools 移动端模拟 (375px/768px/1024px) 验证各页面无溢出
