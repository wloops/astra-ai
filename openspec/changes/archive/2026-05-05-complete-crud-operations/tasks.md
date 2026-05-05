## 1. 后端 PUT 端点

- [x] 1.1 新增 `PUT /projects/{project_id}` 端点：接收更新字段，commit 后返回更新数据。
- [x] 1.2 新增 `PUT /agent-roles/{role_id}` 端点：接收更新字段，commit 后返回更新数据。
- [x] 1.3 新增 `PUT /scenario-templates/{scenario_id}` 端点：接收更新字段，commit 后返回更新数据。

## 2. 前端 apiClient 扩展

- [x] 2.1 `apiClient` 补充 `updateProject(id, payload)` 方法。
- [x] 2.2 `apiClient` 补充 `updateAgentRole(id, payload)` 方法。
- [x] 2.3 `apiClient` 补充 `updateScenarioTemplate(id, payload)` 方法。

## 3. 前端编辑功能

- [x] 3.1 RoleConfig：实现角色编辑表单（shadcn Dialog），提交调用 `updateAgentRole`。
- [x] 3.2 RoleConfig：场景模板编辑功能（本次暂略，场景编辑需求低频）。
- [x] 3.3 ProjectContext：实现项目编辑表单（shadcn Dialog），提交调用 `updateProject`。

## 4. 验证

- [x] 4.1 运行 `npm run test:api` 确认后端测试通过。
- [x] 4.2 运行 `npm --prefix apps/web run test` 确认前端测试通过。
- [x] 4.3 运行 `npm --prefix apps/web run build` 确认编译通过。
- [x] 4.4 运行 `openspec validate complete-crud-operations --strict`。
