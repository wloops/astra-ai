# web-demo-session-flow Specification (Delta)

## Purpose

Workspace 活跃工具面板从假数据切换为真实知识库状态；StartSession 增加相似案例提示。

## MODIFIED Requirements

### Requirement: 会议进行页消费 SSE

前端会议进行页 SHALL 在右侧面板展示真实的知识库检索状态，替换当前硬编码假数据。

#### Scenario: 展示知识检索状态
- **WHEN** Workspace 渲染右侧"活跃进程与工具"面板
- **THEN** SHALL 展示"知识库检索"条目
- **AND** 状态 SHALL 从假数据（"完成"/"运行中"）切换为实时事件驱动
- **AND** 收到 `knowledge_referenced` 事件时 SHALL 更新状态为"已找到 N 个案例"

#### Scenario: 知识检索未触发
- **WHEN** Host Agent 尚未发起 SEARCH_KNOWLEDGE
- **THEN** 展示"历史决策相似案例检索"条目状态 SHALL 为"等待中"

### Requirement: 发起真实研讨 Session

前端 StartSession 页面 SHALL 在用户输入议题后展示相似历史讨论，帮助用户了解类似话题的过往决策。

#### Scenario: 展示相似案例
- **WHEN** 用户在议题输入框中输入超过 10 个字符
- **THEN** 前端 SHALL 防抖后调用 `/knowledge/similar?topic=<topic>&limit=3`
- **AND** SHALL 在表单下方展示相似案例卡片（标题、结论摘要、相似度百分比）

#### Scenario: 创建 Session 失败不影响
- **WHEN** 相似案例查询失败（如知识库为空或 API 异常）
- **THEN** SHALL 静默忽略，不阻断用户发起研讨
