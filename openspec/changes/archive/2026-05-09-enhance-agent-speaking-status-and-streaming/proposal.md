# 增强研讨发言状态与单 Agent 流式展示

## 为什么

当前 Workspace 的角色卡片只展示角色基础信息，用户无法直接判断谁正在发言、谁已完成、并行阶段是否仍在处理中。单 Agent 阶段的长文本也只能在完成后一次性出现，缺少实时进行感。

## 改什么

- 在 SSE 事件协议中补充单 Agent 发言的增量事件和完成事件。
- Workspace 角色卡片根据 SSE 事件推导并展示角色状态。
- 单 Agent 阶段使用流式展示体验；多 Agent 并行阶段保持完整消息到达后一次性展示。
- 保留既有 `agent_message` 事件，兼容旧客户端和历史事件。

## 影响

- 后端新增 `agent_message_delta` 与 `agent_message_done` 事件类型。
- 前端 Workspace 新增流式消息合并逻辑和角色状态 badge。
- 不改变现有 REST 接口，不新增轮询。
