## Context

上一 change `connect-frontend-pages-to-api` 已将 4 个主要页面的数据源从 mock 切换到 API，但若干子组件和交互细节被遗漏。Dashboard 的 EfficiencyOverview 仍为硬编码图表数据，SessionHistory 的搜索/过滤/场景名均未接通，workspace 下 3 个旧版 mock 组件已成死代码。本次逐一补齐。

## Goals / Non-Goals

**Goals:**
- EfficiencyOverview 图表展示近 7 天真实 session 创建趋势。
- SessionHistory 搜索框支持前端过滤；项目/场景下拉框从 API 动态填充；详情面板展示场景名称。
- QuickStart 两个未绑定按钮补充路由跳转。
- RecommendedSteps 根据真实数据展示建议。
- ProjectFilters 搜索框接通 onChange 过滤。
- 删除 `components/workspace/` 下 3 个死代码文件。

**Non-Goals:**
- 不做日期范围选择器（DatePicker）实现。
- 不做后端分页/搜索 API（保持前端过滤）。
- 不做 Recharts 图表库更换。

## Decisions

### 1. EfficiencyOverview 数据源：前端聚合

**决策**：从 `GET /sessions` 取全部 session，按 `created_at` 按日分组统计近 7 天的创建数量。复用率从 `GET /projects` 的 completeness 字段取平均值。

**理由**：数据量小，前端聚合简单直接。无需新增后端统计接口。

### 2. SessionHistory 过滤：前端文本匹配

**决策**：搜索框对 `topic` 做 `includes` 文本匹配；项目/场景下拉框从 API 获取列表后做前端筛选。

**理由**：当前 session 数量少（预计 < 100），前端过滤性能足够。

### 3. SessionHistory 场景名称：加载 API 并缓存

**决策**：在 `useEffect` 中同时调用 `listScenarioTemplates`，与 projects 一样缓存为查找用 Map。

### 4. Dead code 清理：直接删除

**决策**：删除 `WorkspaceLeftPanel.tsx`、`WorkspaceCenterPanel.tsx`、`WorkspaceRightPanel.tsx`，确认无其他文件引用。

### 5. ProjectFilters 搜索：通过父组件控制

**决策**：ProjectFilters 添加 `searchQuery` 和 `onSearchChange` props，父组件 ProjectContext 管理搜索状态并传递给 ProjectGrid 做过滤。

## Risks / Trade-offs

- **EfficiencyOverview 近 7 天无数据时图表为空** → 展示"暂无数据"占位。
- **删除 workspace 子组件可能被间接引用** → 删除前 Grep 确认零引用。
