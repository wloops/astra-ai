# web-demo-session-flow Specification (Delta)

## Purpose

更新前端事件消费和展示逻辑，适配 Host Agent 决策循环产生的新事件类型和动态流程。

## MODIFIED Requirements

### Requirement: 会议进行页消费 SSE

前端会议进行页 SHALL 订阅后端 SSE 事件流并展示真实研讨过程，包括 Host Agent 决策、阶段跳过/新增、角色变更等新事件。

#### Scenario: 展示 Host Agent 决策
- **WHEN** 前端收到 `host_decision` 事件
- **THEN** 会议进行页 SHALL 渲染决策卡片
- **AND** 卡片 SHALL 展示决策原因（中文）和动作类型
- **AND** 阶段进度列表 SHALL 动态更新（非固定 9 阶段）

#### Scenario: 展示阶段跳过
- **WHEN** 前端收到 `stage_skipped` 事件
- **THEN** 阶段进度列表 SHALL 标记该阶段为"已跳过"并展示跳过原因

#### Scenario: 展示新增阶段
- **WHEN** 前端收到 `stage_added` 事件
- **THEN** 阶段进度列表 SHALL 动态插入新阶段

#### Scenario: 展示角色变更
- **WHEN** 前端收到 `role_pulled` 或 `role_removed` 事件
- **THEN** 角色展示区域 SHALL 动态新增或移除角色卡片

#### Scenario: 展示 Agent 发言
- **WHEN** 前端收到 `agent_message` 事件
- **THEN** 会议进行页 SHALL 将事件转换为对应角色的发言项
- **AND** SHALL 展示角色、阶段、模型名称和消息摘要

#### Scenario: 展示争议识别
- **WHEN** 前端收到 `conflict_detected` 事件
- **THEN** 会议进行页 SHALL 展示关键争议点
- **AND** SHALL 标记支持方、审慎方和裁决结论

#### Scenario: Session 完成后进入结果页
- **WHEN** 前端收到 `session_completed` 事件
- **THEN** 会议进行页 SHALL 提供进入结果页的入口
- **AND** SHALL 携带当前 Session ID

### Requirement: 会议结果页读取真实结果

前端会议结果页 SHALL 使用后端 `SessionResult` 渲染结构化交付物，并展示实际执行流程与场景建议流程的对比。

#### Scenario: 渲染流程对比
- **WHEN** 结果页获得有效 Session ID 且结果含 `actual_flow` 字段
- **THEN** 前端 SHALL 渲染实际执行流程（标注跳过的阶段和新增的阶段）
- **AND** SHALL 与场景建议流程并排展示对比

#### Scenario: 渲染完成结果（兼容旧数据）
- **WHEN** 结果页获得有效 Session ID 但结果不含 `actual_flow`（旧数据）
- **THEN** 前端 SHALL 正常渲染其他字段，流程对比区域显示"该研讨使用旧版流程，无流程对比数据"
