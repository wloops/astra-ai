## Context

当前前端 4 个页面使用硬编码 mock 数据。后端已有 `GET/POST /projects`、`GET/POST /agent-roles`、`GET/POST /scenario-templates`、`GET /sessions` 等接口，前端 `apiClient` 已封装 `listProjects`、`listAgentRoles`、`listScenarioTemplates`。需要将这些页面的数据源从 mock 切换到真实 API，并补充缺失的 API 方法和类型定义。

## Goals / Non-Goals

**Goals:**
- Dashboard 的统计数据、最近项目、最近会议改为从后端 API 获取。
- SessionHistory 的列表和详情改为从 `GET /sessions` 和 `GET /sessions/{id}/result` 获取。
- ProjectContext 的项目列表改为 `GET /projects`；实现新建项目表单并调用 `POST /projects`。
- RoleConfig 的角色和场景列表改为 `GET /agent-roles`、`GET /scenario-templates`；实现新建角色表单并调用 `POST /agent-roles`。
- `apiClient` 补充 `listSessions`、`createProject`、`createAgentRole`、`createScenarioTemplate` 方法。

**Non-Goals:**
- 不改后端 API（已有接口足够）。
- 不做 PUT 更新操作（RoleConfig 编辑、项目编辑）。
- 不做 UI 重构，保留现有视觉风格。
- 不引入用户系统，"我创建的"/"我参与的"等分类暂不实现。

## Decisions

### 1. 字段映射策略：内联转换

**决策**：在各页面组件内部做字段映射（如 `project.name → title`），不创建独立的 adapter 层。

**理由**：每个页面的 mock 字段与后端字段的映射各不相同，创建统一 adapter 反而增加抽象复杂度。页面数量有限（4 个），内联映射更直观。

**备选**：创建 `adapters.ts` 统一转换函数 → 拒绝，4 个页面差异太大难以统一。

### 2. Dashboard 统计：前端聚合

**决策**：Dashboard 的统计数据（本周研讨次数、达成结论数等）由前端从 `GET /sessions` 和 `GET /projects` 列表中聚合计算，不新增后端统计接口。

**理由**：当前数据量小（演示用途），前端聚合性能足够。新增后端统计接口属于过度工程。

### 3. SessionHistory 分页：前端分页

**决策**：SessionHistory 调用 `GET /sessions` 获取全部 session 列表后，在前端做分页和搜索过滤，不要求后端支持 offset/limit 参数。

**理由**：演示数据量小（预计几十条），全量加载可接受。避免后端 API 变更。

### 4. RoleConfig 编辑：本次不做

**决策**：RoleConfig 页面仅做数据读取展示和新建角色，不做编辑更新。编辑按钮保持占位状态。

**理由**：编辑功能需要后端 `PUT /agent-roles/{id}` 和表单验证/冲突处理，工作量较大。先打通数据的读和写，编辑留待后续。

### 5. apiClient 扩展方式

**决策**：在现有 `client.ts` 中添加 `listSessions`、`createProject`、`createAgentRole`、`createScenarioTemplate` 方法，遵循已有的 `apiClient` 单例模式和请求封装风格。

## Risks / Trade-offs

- **字段映射遗漏** → 每个页面的字段映射需要在测试验证时逐项检查。
- **Dashboard 统计数据可能不准确** → 前端聚合依赖全量加载，数据量大后可能变慢。当前可接受。
- **RoleConfig 角色数据结构差异大**（tools 对象数组 ↔ 字符串数组、styles 数组 ↔ output_style 单字符串）→ 需要细心映射，丢失部分信息（如 icon/color 等纯前端字段用默认值）。
