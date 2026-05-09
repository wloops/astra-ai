## 1. 后端数据模型与 API

- [x] 1.1 新增人工确认请求持久化结构，包含 session、问题、原因、阻塞级别、选项、状态、回答、超时策略、影响说明和时间字段。
- [x] 1.2 扩展事件类型，新增 `human_review_requested`、`human_review_resolved`、`human_review_timeout`，并保持 SSE 事件序列兼容。
- [x] 1.3 新增人工确认响应端点，支持用户提交回答并拒绝已完成或已超时请求的重复提交。
- [x] 1.4 扩展 Session 查询或事件恢复能力，使前端能在 `paused` 状态下恢复 pending 人工确认请求。

## 2. Host Agent 编排与问题分类

- [x] 2.1 扩展 LLM Gateway 的 Host 决策 schema，加入 `REQUEST_HUMAN_REVIEW` 及其结构化参数。
- [x] 2.2 在 Host 决策 normalize 与 fallback 逻辑中限制人工确认请求格式，避免缺少 question/reason/impact 的无效请求。
- [x] 2.3 在 orchestrator 中实现人工确认暂停、响应恢复、超时恢复和 critical 超时终止逻辑。
- [x] 2.4 增加问题分类处理，将候选问题分为已由上下文解决、需要辩论、需要人工确认、转行动项和未解决。
- [x] 2.5 调整 `judge_and_summarize` 与 `generate_actions` 上下文，确保已解决问题不进入最终 `open_questions`，待决问题不被无条件转成行动项。
- [x] 2.6 修正有争议时跳过 `debate` 的条件，避免存在实质 conflicts 时因 `host_hints` 直接跳过辩论。

## 3. 前端会议中人工确认

- [x] 3.1 扩展前端 API 类型和 SSE 事件类型，支持人工确认请求、响应和超时事件。
- [x] 3.2 在 Workspace 中渲染人工确认弹窗，展示问题、原因、阻塞级别、选项、超时和影响说明。
- [x] 3.3 实现人工确认提交交互，调用响应端点并处理提交中、成功、失败和已超时状态。
- [x] 3.4 在会议时间线和阶段进度中展示人工确认请求、完成和超时事件。
- [x] 3.5 支持页面刷新或重新进入 Workspace 时恢复 pending 人工确认请求。

## 4. 结果页语义展示

- [x] 4.1 更新 SessionResult 类型与渲染逻辑，兼容旧字符串 `open_questions` 和新的结构化 unresolved item。
- [x] 4.2 结果页区分已确认决策、未确认问题和可执行行动项，展示来源、阻塞级别、影响和依赖关系。
- [x] 4.3 保持行动项转任务功能可用，并在行动项依赖未解决问题时提示该依赖。

## 5. 测试与验证

- [x] 5.1 添加后端 pytest 覆盖人工确认请求创建、响应提交、重复提交拒绝、超时继续和 critical 超时终止。
- [x] 5.2 添加后端 orchestrator 测试覆盖问题分类、已解决问题不进入 `open_questions`、待决问题不被无条件转行动项。
- [x] 5.3 添加前端 Vitest 覆盖 Workspace 人工确认弹窗、响应失败、超时事件和刷新恢复。
- [x] 5.4 添加前端 Vitest 覆盖结果页结构化待确认问题和旧字符串问题兼容渲染。
- [x] 5.5 运行 `npm run test:api`、`npm --prefix apps/web run test` 和 `npx openspec validate --strict`。

