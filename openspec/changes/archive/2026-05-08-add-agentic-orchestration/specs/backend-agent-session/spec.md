# backend-agent-session Specification (Delta)

## Purpose

更新研讨执行引擎：从硬编码 LangGraph 线性图升级为 Host Agent 驱动循环。

## MODIFIED Requirements

### Requirement: LangGraph 真实逐步运行

后端 SHALL 使用 Host Agent 决策循环按阶段推进智能研讨流程——Host Agent 每轮评估状态并输出结构化决策（NEXT_STAGE/SKIP_STAGE/ADD_STAGE/PULL_ROLE/REMOVE_ROLE/CONCLUDE）。场景模板的 `stages` 和 `host_hints` 作为 Host Agent 的参考建议。核心审议阶段 SHALL 通过 LLM Gateway 产出 AI 推理结果。

#### Scenario: Host Agent 主持研讨流程
- **WHEN** Session 被创建
- **THEN** 系统 SHALL 启动 Host Agent 决策循环
- **AND** 每轮 SHALL 将当前状态（议题、项目、场景建议、已完成阶段、角色产出）注入 Host Agent 决策上下文
- **AND** Host Agent SHALL 输出结构化决策决定下一步动作
- **AND** 系统 SHALL 执行决策并写入对应事件

#### Scenario: 阶段执行流程
- **WHEN** Host Agent 决策进入审议阶段（如 independent_review）
- **THEN** 系统 SHALL 更新 Session 状态并写入 `stage_started` 事件
- **AND** `independent_review` SHALL 并行调用所有非 host 角色的 LLM Gateway
- **AND** 每个角色产出 SHALL 写入 `agent_message` 事件
- **AND** 阶段完成后 SHALL 写入 `stage_completed` 事件

#### Scenario: 节点执行失败
- **WHEN** 任一阶段执行失败
- **THEN** Host Agent SHALL 在下一轮决策中获知失败信息
- **AND** 可选择重试、跳过或 CONCLUDE
- **AND** 连续失败 SHALL 最终触发安全终止

#### Scenario: LLM 调用失败时回退到本地 fallback
- **WHEN** LLM 远程调用失败或未配置模型
- **THEN** Gateway SHALL 回退到 `_complete_local` 确定性响应
- **AND** Session SHALL 仍可继续由 Host Agent 推进到完成

### Requirement: 研讨 Session 创建与查询

后端 SHALL 支持创建、查询和列出智能研讨 Session。创建时可选指定 `role_ids`（覆盖场景默认角色）和 `model_overrides`（覆盖默认模型路由）。

#### Scenario: 创建研讨 Session
- **WHEN** 客户端提交项目 ID、场景 ID、议题和可选角色 ID
- **THEN** 系统 SHALL 创建研讨 Session
- **AND** SHALL 启动 Host Agent 决策循环
- **AND** SHALL 返回 Session 当前状态

#### Scenario: 使用场景默认角色
- **WHEN** 客户端未指定 `role_ids`
- **THEN** 系统 SHALL 使用场景模板的 `default_role_codes` 作为初始角色
- **AND** Host Agent 可在研讨中动态调整

#### Scenario: 查询研讨 Session
- **WHEN** 客户端请求指定 Session
- **THEN** 系统 SHALL 返回 Session 的状态、当前阶段、议题、项目 ID、场景 ID、角色 ID
- **AND** 若研讨已完成，SHALL 包含质量指标（metrics）

### Requirement: SSE 事件流

后端 SHALL 通过 SSE 推送研讨过程事件，包括新增的 Host Agent 决策事件。

#### Scenario: 推送 Host Agent 决策事件
- **WHEN** Host Agent 做出决策
- **THEN** 系统 SHALL 推送 `host_decision` 事件
- **AND** payload SHALL 包含 `action`、`reason` 和决策相关参数

#### Scenario: 推送阶段跳过事件
- **WHEN** Host Agent 决策 SKIP_STAGE
- **THEN** 系统 SHALL 推送 `stage_skipped` 事件
- **AND** payload SHALL 包含被跳过的 `stage` 和 `reason`

#### Scenario: 推送角色变更事件
- **WHEN** Host Agent 决策 PULL_ROLE 或 REMOVE_ROLE
- **THEN** 系统 SHALL 推送 `role_pulled` 或 `role_removed` 事件

### Requirement: 结构化结果沉淀

后端 SHALL 在研讨完成后生成并持久化结构化结果，包含实际流程路径。

#### Scenario: 获取 Session 结果
- **WHEN** 研讨 Session 完成后客户端请求结果
- **THEN** 系统 SHALL 返回最终结论、关键争议、角色观点摘要、风险、待确认问题、行动项、Markdown 纪要
- **AND** SHALL 返回 `actual_flow`（实际执行阶段序列）、`skipped_stages`（跳过阶段及原因）、`added_stages`（新增阶段）
