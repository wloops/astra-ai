## Context

后端已有 GET/POST 端点和 SQLModel 模型。PUT 端点的实现模式与 POST 一致：接收 JSON body → 查找已有记录 → 更新字段 → commit。

## Goals / Non-Goals

**Goals:**
- 3 个 PUT 端点：projects、agent-roles、scenario-templates。
- 前端编辑表单接入对应 API。
- 编辑成功后 UI 实时刷新。

**Non-Goals:**
- DELETE 端点（数据保留策略）。
- 批量更新或 PATCH（partial update）。
- Session 重试。

## Decisions

### 1. PUT 实现模式：全量替换

**决策**：PUT 端点接收完整 JSON body，将提供的字段覆盖到已有记录（缺失字段不更新）。

**理由**：与 POST 的 schema 保持一致，前端直接复用新建表单的数据结构。

### 2. 编辑表单：shadcn/ui Dialog + Form

**决策**：使用 shadcn/ui 的 Dialog、Form、Input、Textarea、Label、Button 组件构建编辑表单，替换当前手写的内联对话框和 alert() 弹窗。

**理由**：shadcn/ui 组件可访问性更好、视觉一致、内置表单验证支持。

### 3. 前端更新方法：统一命名

**决策**：`apiClient.updateProject(id, payload)`、`updateAgentRole(id, payload)`、`updateScenarioTemplate(id, payload)`。

## Risks / Trade-offs

- **PUT 全量替换可能丢失未展示字段** → 前端编辑表单打开时先 GET 最新数据，提交时发送完整 payload。
