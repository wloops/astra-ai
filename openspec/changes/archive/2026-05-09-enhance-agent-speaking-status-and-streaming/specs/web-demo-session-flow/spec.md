## ADDED Requirements

### Requirement: Workspace 角色状态展示

前端 Workspace SHALL 在 Agent 发言流上方的角色卡片中展示角色当前状态，状态从 SSE 事件流推导，不新增轮询。

#### Scenario: 展示角色发言状态
- **WHEN** 前端收到 `agent_message_delta`
- **THEN** 对应角色卡片 SHALL 显示为“发言中”
- **AND** 发言列表 SHALL 将同一 `message_id` 的片段合并为一条正在输出的发言
- **AND** 单 Agent 发言 SHALL 以本地打字机节奏逐步展示，避免后端片段过快到达时瞬间显示全文

#### Scenario: 展示角色完成状态
- **WHEN** 前端收到 `agent_message_done` 或完整 `agent_message`
- **THEN** 对应角色卡片 SHALL 显示为“已发言”
- **AND** 同一 `message_id` 的流式发言和完整发言 SHALL NOT 重复展示

#### Scenario: 展示并行处理状态
- **WHEN** 前端收到 `parallel_start`
- **THEN** payload 中列出的角色卡片 SHALL 显示为“并行处理中”
- **AND** 并行阶段的完整 `agent_message` 到达后 SHALL 一次性展示对应角色发言

#### Scenario: 展示阶段感知等待提示
- **WHEN** Session 仍在运行且暂未收到下一条发言
- **THEN** 发言区域底部 SHALL 根据当前阶段展示等待提示
- **AND** 总结、行动项、纪要生成等阶段 SHALL 使用对应阶段语义，而不是固定显示等待下一位 Agent 发言

#### Scenario: 发言区域自动滚动
- **WHEN** 新发言、流式字符或等待提示出现且用户位于底部附近
- **THEN** 发言区域 SHALL 自动滚动到底部
- **WHEN** 用户手动向上滚动并离开底部
- **THEN** 发言区域 SHALL 暂停自动跟随并显示滚动到底部按钮
- **WHEN** 用户点击滚动到底部按钮
- **THEN** 发言区域 SHALL 滚动到底部并恢复自动跟随

#### Scenario: 展示角色失败或移除状态
- **WHEN** 前端收到包含错误的 `tool_event`
- **THEN** 对应角色卡片 SHALL 显示为“失败”
- **WHEN** 前端收到 `role_removed`
- **THEN** 对应角色 SHALL 不再作为活跃角色参与展示，或在仍保留的历史视图中显示为“已移除”
