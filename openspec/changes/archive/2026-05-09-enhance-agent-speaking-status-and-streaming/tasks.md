# 任务

- [x] 扩展后端 SessionEvent 类型，新增单 Agent 发言增量与完成事件。
- [x] 在单 Agent 阶段写入 `agent_message_delta`、`agent_message_done` 和兼容的 `agent_message`。
- [x] 保持并行阶段只写入完整 `agent_message`，不产生流式片段。
- [x] 扩展前端事件类型和 Workspace 消息合并逻辑。
- [x] 在角色卡片展示等待中、发言中、已发言、并行处理中、失败、已移除等状态。
- [x] 为单 Agent 消息增加本地打字机展示，避免 delta 过快导致用户看不到流式过程。
- [x] 将底部等待提示改为按当前阶段动态展示。
- [x] 为发言区域增加自动滚动、手动上滚暂停和滚动到底部按钮。
- [x] 补充后端 pytest 和前端 Vitest 覆盖关键行为。
