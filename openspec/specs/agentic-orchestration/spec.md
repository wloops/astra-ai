# agentic-orchestration Specification

## Purpose

Host Agent 主持的研讨编排系统——以 LLM 驱动的决策循环替代硬编码阶段图，场景模板作为建议指南而非强制流程。支持动态阶段决策、角色管理、多角色并行执行和安全终止。

## ADDED Requirements

### Requirement: Host Agent 主持循环

系统 SHALL 以 Host Agent 决策循环替代固定的 LangGraph 线性阶段图。每轮循环中 Host Agent 评估当前状态并输出结构化决策，系统执行决策后进入下一轮。

#### Scenario: 正常研讨流程
- **WHEN** Session 创建后进入 Host Agent 循环
- **THEN** Host Agent SHALL 接收当前状态（议题、项目、场景模板建议、已完成阶段、角色产出摘要）
- **AND** SHALL 输出结构化决策（action + 决策理由）
- **AND** 系统 SHALL 执行决策并写入 `host_decision` 事件

#### Scenario: 循环终止
- **WHEN** Host Agent 决策 `CONCLUDE`
- **THEN** 系统 SHALL 进入 `finalize_minutes` 阶段生成 SessionResult
- **AND** 循环 SHALL 结束

### Requirement: 场景模板建议

系统 SHALL 将 `ScenarioTemplate.stages` 和 `host_hints` 注入 Host Agent 的决策上下文作为参考建议，Host Agent 可据此偏离。

#### Scenario: 遵循场景建议
- **WHEN** 场景模板建议先 clarify 后 review 且当前状态适合
- **THEN** Host Agent 可决策 `NEXT_STAGE` 进入建议的下一阶段

#### Scenario: 偏离场景建议
- **WHEN** Host Agent 判断当前场景无需建议中的某个阶段
- **THEN** Host Agent SHALL 可决策 `SKIP_STAGE` 跳过并说明原因
- **AND** 原因 SHALL 通过 `host_decision` 事件告知用户

### Requirement: 阶段动态决策

Host Agent SHALL 支持以下动作类型：`NEXT_STAGE`（进入建议流程下一阶段）、`SKIP_STAGE`（跳过不必要阶段）、`ADD_STAGE`（新增未预设阶段）、`SEARCH_KNOWLEDGE`（检索知识库）、`CONCLUDE`（结束研讨）。

#### Scenario: 进入下一阶段
- **WHEN** Host Agent 决策 `NEXT_STAGE` 指定 `stage: "independent_review"`
- **THEN** 系统 SHALL 执行 independent_review 阶段（调用所有参与角色的 LLM）
- **AND** SHALL 写入 `stage_started` 和 `stage_completed` 事件

#### Scenario: 跳过阶段
- **WHEN** 独立评审后所有角色立场一致且 Host Agent 决策 `SKIP_STAGE` 跳过 debate
- **THEN** 系统 SHALL 不执行 debate 阶段
- **AND** SHALL 写入 `stage_skipped` 事件含跳过原因
- **AND** Host Agent SHALL 继续下一轮决策

#### Scenario: 新增阶段
- **WHEN** Host Agent 判断需要研讨模板中未预设的议题维度
- **THEN** Host Agent SHALL 可决策 `ADD_STAGE` 指定新阶段名、system prompt
- **AND** 系统 SHALL 执行该临时阶段并写入 `stage_added` 事件

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

### Requirement: 动态角色拉入

Host Agent SHALL 可在研讨中途决策 `PULL_ROLE` 拉入新角色参与后续阶段。

#### Scenario: 拉入已有角色
- **WHEN** Host Agent 识别到需要某个已注册角色的专业知识
- **THEN** 决策 `PULL_ROLE` 指定已存在的 `role_code`
- **AND** 系统 SHALL 将该角色加入当前 Session 并写入 `role_pulled` 事件
- **AND** 该角色 SHALL 参与后续所有阶段的 LLM 调用

#### Scenario: 拉入全新角色
- **WHEN** Host Agent 识别到需要全新角色类型
- **THEN** 决策 `PULL_ROLE` 指定 `role_name` 和 `role_responsibility`
- **AND** 系统 SHALL 临时创建该角色（不持久化到 AgentRole 表）并加入 Session

### Requirement: 角色移除

Host Agent SHALL 可在研讨中途决策 `REMOVE_ROLE` 移除不再需要的角色。

#### Scenario: 移除沉默角色
- **WHEN** 某角色在后续阶段不再相关
- **THEN** Host Agent 决策 `REMOVE_ROLE` 指定 `role_code`
- **AND** 系统 SHALL 写入 `role_removed` 事件
- **AND** 该角色 SHALL 不再参与后续阶段

### Requirement: 多角色并行执行

系统 SHALL 支持在 `independent_review` 等阶段中并行调用多个角色的 LLM，而非串行逐个执行。

#### Scenario: 独立评审并行执行
- **WHEN** Host Agent 决策 `NEXT_STAGE` 或 `PARALLEL_RUN` 进入独立评审阶段
- **THEN** 系统 SHALL 同时向所有非 host 角色发起 LLM 调用
- **AND** SHALL 写入 `parallel_start` 和 `parallel_complete` 事件
- **AND** 并行调用中的单个失败 SHALL 不影响其他角色的执行

#### Scenario: 并行执行结果汇总
- **WHEN** 所有并行调用完成（含部分失败）
- **THEN** 系统 SHALL 将所有角色产出写入对应 `agent_message` 事件
- **AND** 下一轮 Host Agent 决策 SHALL 包含所有成功角色的观点

### Requirement: 安全终止边界

系统 SHALL 在以下条件下强制终止研讨循环：最大迭代次数（默认 20）、连续无进展（3 轮无新阶段完成/角色加入/Agent发言）、总耗时超限（默认 10 分钟）。

#### Scenario: 超过最大迭代次数
- **WHEN** Host Agent 循环迭代次数超过 20
- **THEN** 系统 SHALL 强制终止循环
- **AND** SHALL 以当前状态生成部分 SessionResult
- **AND** Session 状态 SHALL 标记为 `completed`（非 `failed`，已有产出不丢弃）

#### Scenario: 连续无进展
- **WHEN** 连续 3 轮 Host Agent 决策未产生新的 agent_message、阶段完成或角色变更
- **THEN** 系统 SHALL 判定为停滞并强制终止
- **AND** 原因 SHALL 记录为 `no_progress`

#### Scenario: 超时强制终止
- **WHEN** Session 总耗时超过配置的超时上限
- **THEN** 系统 SHALL 强制终止循环

### Requirement: Host Agent 事件推送

系统 SHALL 将 Host Agent 的每轮决策作为 `host_decision` 事件通过 SSE 推送给前端。

#### Scenario: 前端实时展示主持决策
- **WHEN** Host Agent 做出决策
- **THEN** SSE SHALL 推送 `host_decision` 事件
- **AND** 事件 payload SHALL 包含 `action`、`reason` 及相关参数
- **AND** 前端 Workspace SHALL 渲染决策卡片（含中文理由）

#### Scenario: 推送知识检索结果
- **WHEN** Host Agent 执行 SEARCH_KNOWLEDGE 且返回匹配条目
- **THEN** SSE SHALL 推送 `knowledge_referenced` 事件
- **AND** payload SHALL 包含 `matches` 数组（每个含 entry_id、topic、conclusion 摘要、similarity_score）
- **AND** 前端 Workspace SHALL 在知识面板中展示匹配条目列表

### Requirement: SessionResult 流程对比

系统 SHALL 在 SessionResult 中记录实际执行路径与场景建议路径的对比。

#### Scenario: 结果包含流程信息
- **WHEN** Session 完成
- **THEN** SessionResult SHALL 新增 `actual_flow` 字段（实际执行的阶段序列）
- **AND** SHALL 新增 `skipped_stages` 字段（被跳过的阶段及原因）
- **AND** SHALL 新增 `added_stages` 字段（新增的临时阶段）
- **AND** 前端结果页 SHALL 渲染流程对比视图
