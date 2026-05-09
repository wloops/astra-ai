## ADDED Requirements

### Requirement: Workspace 展示交叉辩论过程

会议进行页 SHALL 将交叉辩论过程作为可见的阶段视图展示，帮助用户理解各角色如何回应争议并形成主持人收束。

#### Scenario: 展示辩论开始
- **WHEN** 前端收到 `debate_started` 事件
- **THEN** Workspace SHALL 在 Agent 发言流中创建交叉辩论分组
- **AND** 分组 SHALL 展示争议焦点、参与角色和计划轮次

#### Scenario: 展示单轮角色交锋
- **WHEN** 前端收到 `debate_round` 事件
- **THEN** Workspace SHALL 将其渲染为对应轮次中的角色发言
- **AND** 发言 SHALL 展示角色、立场、核心主张和模型名称
- **AND** 当 payload 包含 `responds_to_role_code` 时，界面 SHALL 标识该发言回应的角色
- **AND** 当 payload 包含证据、风险或让步信息时，界面 SHALL 以可扫描方式展示这些信息

#### Scenario: 展示主持人收束
- **WHEN** 前端收到 `debate_moderated` 事件
- **THEN** Workspace SHALL 在对应轮次后展示主持人判断
- **AND** 内容 SHALL 包含共识、未解决分歧和下一步动作

#### Scenario: 展示辩论完成
- **WHEN** 前端收到 `debate_completed` 事件
- **THEN** Workspace SHALL 标记交叉辩论分组完成
- **AND** SHALL 展示辩论摘要、关键分歧和收敛结论
- **AND** 阶段进度 SHALL 与 `stage_completed` 的 `debate` 状态保持一致

### Requirement: 辩论过程回放与兼容展示

会议进行页和结果页 SHALL 能够从持久化事件恢复辩论过程，并在历史 Session 缺少新事件时保持可用。

#### Scenario: 页面刷新后恢复辩论过程
- **WHEN** Workspace 重新加载已开始或已完成的 Session
- **THEN** 前端 SHALL 通过重放已持久化事件重建交叉辩论分组、轮次、角色发言和主持人收束
- **AND** SHALL 按事件 `sequence` 保持原始讨论顺序

#### Scenario: 兼容缺少辩论过程事件的历史 Session
- **WHEN** Session 事件中不存在 `debate_started`、`debate_round`、`debate_moderated` 或 `debate_completed`
- **THEN** Workspace SHALL 继续展示现有 `agent_message`、`conflict_detected` 和阶段进度
- **AND** SHALL NOT 将缺少结构化辩论事件显示为错误

#### Scenario: 结果页追溯关键辩论
- **WHEN** 结果页能够获取 Session 事件或后端提供的关键辩论摘要
- **THEN** 结果页 SHALL 展示与最终结论相关的关键争议、角色立场和主持人收束
- **AND** 当没有辩论过程数据时，结果页 SHALL 正常展示最终结论、风险、行动项和会议纪要
