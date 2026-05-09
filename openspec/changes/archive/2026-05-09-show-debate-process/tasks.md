## 1. 后端辩论事件

- [x] 1.1 扩展 `EventType`、后端 schema 和 SSE 输出路径，支持 `debate_started`、`debate_round`、`debate_moderated`、`debate_completed`。
- [x] 1.2 调整 `orchestrator.py` 的 `debate` 阶段，使其按辩论开始、角色轮次、主持人收束、辩论完成写入结构化事件。
- [x] 1.3 保留现有 `agent_message`、`stage_completed` 和历史客户端兼容行为。
- [x] 1.4 扩展 `LLMGateway` 辩论阶段输出归一化和本地 fallback，保证远程模型不可用时仍生成可解析辩论过程。

## 2. 前端辩论展示

- [x] 2.1 更新 `apps/web/src/api/types.ts` 和 `apps/web/src/api/events.ts`，让 SSE 订阅接收新辩论事件。
- [x] 2.2 在 Workspace 中从事件流派生辩论分组、轮次、角色回应和主持人收束视图。
- [x] 2.3 支持页面刷新后通过历史事件重建辩论过程，并兼容没有新辩论事件的旧 Session。
- [x] 2.4 在结果页展示关键辩论追溯信息；缺少辩论数据时保持现有结果页正常渲染。

## 3. 测试与验证

- [x] 3.1 增加后端 pytest，覆盖辩论事件持久化、SSE 顺序输出、fallback 辩论过程和旧事件兼容。
- [x] 3.2 增加或更新 Workspace Vitest，覆盖辩论开始、单轮发言、主持人收束、辩论完成和刷新回放。
- [x] 3.3 增加或更新结果页测试，覆盖有辩论追溯和无辩论数据两种情况。
- [x] 3.4 运行 `npm run test:api`、`npm --prefix apps/web run test`，并使用当前 CLI 兼容写法 `npx openspec validate --all --strict` / `npx openspec validate change/show-debate-process --strict` 完成校验（当前仓库仍存在与本变更无关的既有 spec 校验失败项）。
