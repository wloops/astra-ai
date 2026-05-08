# agentic-orchestration Specification (Delta)

## Purpose

Host Agent 新增 SEARCH_KNOWLEDGE 决策类型，允许在研讨中途检索知识库获取历史案例。

## MODIFIED Requirements

### Requirement: 阶段动态决策

Host Agent SHALL 支持以下动作类型：`NEXT_STAGE`（进入建议流程下一阶段）、`SKIP_STAGE`（跳过不必要阶段）、`ADD_STAGE`（新增未预设阶段）、`SEARCH_KNOWLEDGE`（检索知识库）、`CONCLUDE`（结束研讨）。

#### Scenario: 检索知识库
- **WHEN** Host Agent 决策 `SEARCH_KNOWLEDGE` 指定 `query: "微服务边界划分"`
- **THEN** 系统 SHALL 调用知识库搜索（embedding 语义搜索 + fallback LIKE）
- **AND** SHALL 将 top 3 匹配条目的 conclusion + key_conflicts 注入下一轮 Host Agent 决策上下文
- **AND** SHALL 写入 `knowledge_referenced` 事件（含匹配条目摘要）
- **AND** SHALL 递增被引用条目的 `reference_count`

#### Scenario: 知识检索结果为空
- **WHEN** SEARCH_KNOWLEDGE 未找到相似条目
- **THEN** 系统 SHALL 写入 `knowledge_referenced` 事件含 `matches: []`
- **AND** Host Agent SHALL 在下一轮获知"无相关历史记录"

### Requirement: Host Agent 事件推送

系统 SHALL 将 Host Agent 的每轮决策作为事件通过 SSE 推送，包括知识检索事件。

#### Scenario: 推送知识检索结果
- **WHEN** Host Agent 执行 SEARCH_KNOWLEDGE 且返回匹配条目
- **THEN** SSE SHALL 推送 `knowledge_referenced` 事件
- **AND** payload SHALL 包含 `matches` 数组（每个含 entry_id、topic、conclusion 摘要、similarity_score）
- **AND** 前端 Workspace SHALL 在知识面板中展示匹配条目列表
