## 1. 前端迁入与工程整理

- [x] 1.1 清理 `apps/web` 占位内容，并将 `Astra-AI-web-main.zip` 解压迁入 `apps/web`。
- [x] 1.2 调整 `apps/web/package.json` 项目名称、脚本和依赖，使其作为 monorepo 前端应用运行。
- [x] 1.3 确认现有路由、页面和组件在迁入后仍能编译通过。
- [x] 1.4 保留现有 UI 风格，不做大规模视觉重构。

## 2. 前端 API 与类型层

- [x] 2.1 新增前端 API base URL 配置，默认使用 `http://127.0.0.1:8010`。
- [x] 2.2 定义前端领域类型：Project、AgentRole、ScenarioTemplate、Session、SessionEvent、SessionResult。
- [x] 2.3 实现统一 API client，封装项目、角色、场景、Session 创建、Session 查询和结果查询。
- [x] 2.4 实现 SSE 订阅封装，将后端事件转换为前端可消费的事件对象。

## 3. 发起研讨页接入

- [x] 3.1 发起研讨页加载真实项目、角色和场景模板数据。
- [x] 3.2 用后端数据替换关键选择控件的静态数据。
- [x] 3.3 提交表单时调用 `POST /sessions` 创建真实 Session。
- [x] 3.4 创建成功后携带 Session ID 跳转会议进行页；失败时展示错误状态。

## 4. 会议进行页接入

- [x] 4.1 会议进行页从路由 query 中读取 Session ID。
- [x] 4.2 进入页面后查询 Session 基础信息，并订阅 `GET /sessions/{session_id}/events`。
- [x] 4.3 将 `stage_started`、`stage_completed` 事件映射到阶段进度展示。
- [x] 4.4 将 `agent_message` 事件映射到 Agent 发言流。
- [x] 4.5 将 `conflict_detected` 事件映射到争议展示。
- [x] 4.6 收到 `session_completed` 后显示进入结果页入口；收到 `session_failed` 后展示失败状态。

## 5. 会议结果页接入

- [x] 5.1 结果页从路由 query 中读取 Session ID。
- [x] 5.2 调用 `GET /sessions/{session_id}/result` 获取结构化结果。
- [x] 5.3 用真实结果渲染最终结论、关键争议、角色观点、风险、待确认问题和行动项。
- [x] 5.4 渲染 Markdown 纪要预览；结果未生成时展示等待或返回会议进行页状态。

## 6. 根目录启动与文档

- [x] 6.1 在根目录新增 `dev:web` 脚本。
- [x] 6.2 在根目录新增并发 `dev` 脚本，同时启动 API 和 Web。
- [x] 6.3 更新根目录 README，说明前后端默认端口、环境变量和启动方式。
- [x] 6.4 更新 `apps/web` README，说明前端迁入来源和后端连接配置。

## 7. 验证

- [x] 7.1 运行前端类型检查或构建，确认迁入后可编译。
- [x] 7.2 运行后端测试，确认后端 API/SSE 契约未回归。
- [x] 7.3 启动前后端，手动验证发起研讨、会议进行页事件流和结果页闭环。
- [x] 7.4 运行 `openspec validate connect-web-demo-to-backend --strict`。
