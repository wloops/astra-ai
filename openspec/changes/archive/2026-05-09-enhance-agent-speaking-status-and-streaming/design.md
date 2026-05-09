# 设计

## 总体方案

单 Agent 阶段在后端获得完整结构化输出后，将摘要内容切分为多个 SSE 片段，依次写入 `agent_message_delta`，随后写入 `agent_message_done` 和既有 `agent_message`。这样前端可以呈现流式体验，同时旧客户端仍能消费完整消息。

并行阶段保持当前 `parallel_start`、多个 `agent_message`、`parallel_complete` 的事件模型，不做片段化，避免多个角色的输出交错。

## 前端状态推导

Workspace 不新增轮询。角色卡片状态从事件流推导：

- `stage_started`：Host 进入发言或主持状态。
- `agent_message_delta`：对应角色为发言中。
- `agent_message_done` 或 `agent_message`：对应角色为已发言。
- `parallel_start`：payload 中的角色为并行处理中。
- `tool_event` 且包含错误：对应角色为失败。
- `role_removed`：对应角色为已移除。

## 本地流式与滚动

前端 SHALL 将单 Agent 消息拆成 `targetContent` 与当前可见 `content`，即使后端 delta 很快到达，也通过本地打字机节奏逐步补齐。并行阶段的消息不进入本地打字机，避免多个角色输出交错。

消息列表默认跟随最新内容滚动到底部；当用户手动上滚并离开底部时暂停自动跟随，并显示“滚动到底部”按钮。用户点击按钮后恢复自动跟随。

## 兼容性

`agent_message` 保持不变，并继续作为完整消息事件。前端收到同一 `message_id` 的流式完成事件和完整事件时只保留一条发言，避免重复展示。
