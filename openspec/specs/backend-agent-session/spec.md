# backend-agent-session Specification

## Purpose
TBD - created by archiving change build-astra-backend-mvp. Update Purpose after archive.
## Requirements
### Requirement: 轻量 monorepo 后端骨架

系统 SHALL 在空仓库中提供轻量 monorepo 结构，包含可运行的后端应用和前端占位目录。

#### Scenario: 初始化后端工作区
- **WHEN** 开发者查看仓库结构
- **THEN** SHALL 存在 `apps/api` 后端应用目录
- **AND** SHALL 存在 `apps/web` 前端占位目录
- **AND** SHALL 在根目录提供后端开发启动入口

### Requirement: 项目上下文管理

后端 SHALL 支持创建和读取项目上下文，作为 Agent 研讨的背景资料。

#### Scenario: 创建项目上下文
- **WHEN** 客户端提交项目名称、目标、背景、架构、风险和约束
- **THEN** 系统 SHALL 持久化项目上下文
- **AND** SHALL 返回项目 ID、创建时间和更新时间

#### Scenario: 列出项目上下文
- **WHEN** 客户端请求项目列表
- **THEN** 系统 SHALL 返回已持久化的项目上下文集合

### Requirement: 数据库化角色 Skill Registry

后端 SHALL 将 Agent 角色 Skill 配置存储在数据库中。

#### Scenario: 初始化默认角色
- **WHEN** 后端首次启动
- **THEN** 系统 SHALL 初始化默认角色
- **AND** 默认角色 SHALL 至少包含 AI 主持人、产品经理、后端架构师和测试工程师

#### Scenario: 创建角色配置
- **WHEN** 客户端提交角色名称、代号、职责、关注维度、工具和输出风格
- **THEN** 系统 SHALL 持久化该角色配置

### Requirement: 数据库化场景模板 Registry

后端 SHALL 将场景模板配置存储在数据库中。

#### Scenario: 初始化默认场景模板
- **WHEN** 后端首次启动
- **THEN** 系统 SHALL 初始化默认智能研讨场景模板
- **AND** 场景模板 SHALL 包含默认阶段、默认角色和输出结构说明

#### Scenario: 创建场景模板
- **WHEN** 客户端提交场景名称、阶段、默认角色和输出模板
- **THEN** 系统 SHALL 持久化该场景模板

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

后端 SHALL 通过 SSE 推送研讨过程事件，包括 Host Agent 决策事件。

#### Scenario: 订阅 Session 事件
- **WHEN** 客户端请求 `GET /sessions/{session_id}/events`
- **THEN** 系统 SHALL 返回 `text/event-stream`
- **AND** SHALL 按顺序推送已持久化的 SessionEvent

#### Scenario: 推送阶段事件
- **WHEN** Host Agent 决策执行阶段
- **THEN** 系统 SHALL 推送阶段开始、Agent 发言、争议识别、阶段完成、Session 完成或 Session 失败事件

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

### Requirement: Host Agent 主持研讨流程

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

### Requirement: 结构化结果沉淀

后端 SHALL 在研讨完成后生成并持久化结构化结果，包含实际流程路径。

#### Scenario: 获取 Session 结果
- **WHEN** 研讨 Session 完成后客户端请求结果
- **THEN** 系统 SHALL 返回最终结论、关键争议、角色观点摘要、风险、待确认问题、行动项、Markdown 纪要
- **AND** SHALL 返回 `actual_flow`（实际执行阶段序列）、`skipped_stages`（跳过阶段及原因）、`added_stages`（新增阶段）

### Requirement: 前端演示可消费契约

后端 SHALL 保持现有 REST 与 SSE 接口可被本地前端 demo 直接消费。

#### Scenario: 本地前端跨端口访问
- **WHEN** 前端从 Vite 开发服务器访问后端 API
- **THEN** 后端 SHALL 允许本地开发环境的跨域请求
- **AND** SHALL 返回 UTF-8 JSON 响应

#### Scenario: 前端订阅已存在事件
- **WHEN** 前端在 Session 已经开始或完成后订阅 `GET /sessions/{session_id}/events`
- **THEN** 后端 SHALL 按持久化顺序返回该 Session 的事件
- **AND** SHALL 在完成或失败后结束事件流

#### Scenario: 前端查询完成结果
- **WHEN** 前端使用完成的 Session ID 请求 `GET /sessions/{session_id}/result`
- **THEN** 后端 SHALL 返回可直接渲染的结构化结果字段
- **AND** SHALL 包含 `final_conclusion`、`key_conflicts`、`role_summaries`、`risks`、`open_questions`、`actions` 和 `markdown_minutes`

### Requirement: 单模型 LLM Gateway

后端 SHALL 通过 LLM Gateway 封装模型调用。Gateway SHALL 按阶段提供专用 prompt 工程并正确解析结构化输出。Gateway SHALL 支持多模型路由——通过模型花名册、Stage/Role 路由配置和 Session 级覆盖按优先级选择实际调用模型。

#### Scenario: 多模型路由调用
- **WHEN** Agent 阶段需要模型输出
- **THEN** 系统 SHALL 通过统一 Gateway 传入角色、阶段、输入和输出要求
- **AND** Gateway SHALL 根据阶段选择对应的 system prompt 和输出 JSON schema
- **AND** Gateway SHALL 按 Session覆盖 > Role路由 > Stage路由 > Default Profile > `ASTRA_LLM_MODEL` 优先级解析实际使用的模型
- **AND** Gateway SHALL 根据解析出的模型 profile 配置（model/base_url/api_key）发起调用

#### Scenario: 远程模型返回结构化 JSON
- **WHEN** 远程 LLM 返回包含结构化字段的 JSON
- **THEN** Gateway SHALL 提取 `summary`、`stance`、`risks`、`open_questions`、`actions` 各字段
- **AND** SHALL 对缺失字段补默认值，不做整体 fallback
- **AND** JSON 解析失败时 SHALL 回退到本地 fallback

#### Scenario: 未配置真实模型
- **WHEN** 系统未配置模型地址或 API Key（所有 profile 和全局配置均无效）
- **THEN** Gateway SHALL 使用本地确定性 responder 推进流程
- **AND** SHALL 保证 Session 仍按阶段产生事件和结果

### Requirement: LLM Gateway 重试与可观测性

LLM Gateway SHALL 对可恢复的远程调用失败进行重试，并记录每次调用的日志（含模型名称）。

#### Scenario: 网络超时或服务端错误时自动重试
- **WHEN** `_complete_remote` 遭遇 `httpx.TimeoutException`、`ConnectError` 或 HTTP 5xx 响应
- **THEN** Gateway SHALL 自动重试最多 2 次，间隔 1 秒
- **AND** 重试用尽后 SHALL fallback 到 `_complete_local`

#### Scenario: 鉴权或客户端错误不重试
- **WHEN** `_complete_remote` 收到 HTTP 401/403/400 响应（如模型不存在、API Key 无效）
- **THEN** Gateway SHALL 不重试，直接抛出异常
- **AND** Session SHALL 标记为 failed

#### Scenario: 记录调用日志含模型信息
- **WHEN** Gateway 执行任何 LLM 调用
- **THEN** SHALL 通过 Python logging 记录 stage、role、model（实际模型名）、耗时（毫秒）和结果状态（success/fallback/error）

### Requirement: 项目上下文更新

后端 SHALL 支持更新已有项目上下文。

#### Scenario: 更新项目
- **WHEN** 客户端 PUT `/projects/{project_id}` 提交更新字段
- **THEN** 后端 SHALL 更新项目记录并返回更新后的数据
- **AND** 项目不存在时 SHALL 返回 404

### Requirement: 角色配置更新

后端 SHALL 支持更新已有 Agent 角色配置。

#### Scenario: 更新角色
- **WHEN** 客户端 PUT `/agent-roles/{role_id}` 提交更新字段
- **THEN** 后端 SHALL 更新角色记录并返回更新后的数据
- **AND** 角色不存在时 SHALL 返回 404

### Requirement: 场景模板更新

后端 SHALL 支持更新已有场景模板。

#### Scenario: 更新场景模板
- **WHEN** 客户端 PUT `/scenario-templates/{scenario_id}` 提交更新字段
- **THEN** 后端 SHALL 更新场景模板记录并返回更新后的数据
- **AND** 场景模板不存在时 SHALL 返回 404

### Requirement: 单 Agent 发言流式事件

后端 SHALL 在单 Agent 阶段通过 SSE 写入可增量展示的发言事件，同时保留完整 `agent_message` 事件以兼容旧客户端。

#### Scenario: 单 Agent 阶段产生流式片段
- **WHEN** Host Agent 执行非并行的单 Agent 阶段并获得发言内容
- **THEN** 系统 SHALL 写入一个或多个 `agent_message_delta` 事件
- **AND** 每个 `agent_message_delta` payload SHALL 包含 `message_id`、`delta`、`role_code`、`stage` 和 `model_used`
- **AND** 系统 SHALL 写入 `agent_message_done` 事件标记同一 `message_id` 已完成
- **AND** 系统 SHALL 继续写入完整 `agent_message` 事件

#### Scenario: 并行阶段不产生流式片段
- **WHEN** 系统执行 `PARALLEL_RUN` 或 `independent_review` 并行阶段
- **THEN** 系统 SHALL 写入 `parallel_start` 和 `parallel_complete` 事件
- **AND** 每个角色产出 SHALL 以完整 `agent_message` 写入
- **AND** 系统 SHALL NOT 为该并行阶段写入 `agent_message_delta`

### Requirement: 人工确认请求

Host Agent SHALL be able to pause a running Session to request human review when a decision requires missing business facts, authorization, or policy interpretation that cannot be safely inferred from existing context.

#### Scenario: 请求人工确认
- **WHEN** Host Agent determines that a question requires human input before the next decision
- **THEN** the system SHALL persist a human review request with question, reason, blocking level, options, timeout, default timeout behavior, and impact
- **AND** the system SHALL update the Session status to `paused`
- **AND** the system SHALL emit a `human_review_requested` event containing the request payload

#### Scenario: 提交人工确认
- **WHEN** the client submits a response for a pending human review request
- **THEN** the system SHALL mark the request as resolved
- **AND** the system SHALL emit a `human_review_resolved` event
- **AND** the system SHALL add the response to the Host Agent context before continuing the Session
- **AND** the system SHALL update the Session status back to `running`

#### Scenario: 拒绝重复响应
- **WHEN** the client submits a response for a resolved or timed-out human review request
- **THEN** the system SHALL reject the response with a conflict error
- **AND** the existing request status SHALL remain unchanged

### Requirement: 人工确认超时

The system SHALL handle human review timeout without leaving the Session permanently paused.

#### Scenario: 普通确认超时后继续研讨
- **WHEN** a pending human review request reaches its timeout and its timeout behavior is `mark_open_question`
- **THEN** the system SHALL mark the request as timed out
- **AND** the system SHALL emit a `human_review_timeout` event
- **AND** the system SHALL add a structured unresolved item to `open_questions`
- **AND** the system SHALL continue the Session with status `running`

#### Scenario: 使用默认保守选项继续
- **WHEN** a pending human review request reaches its timeout and its timeout behavior is `use_default`
- **THEN** the system SHALL record the default answer as the review outcome
- **AND** the system SHALL emit a `human_review_timeout` event that includes the default answer
- **AND** the system SHALL add the default answer to the Host Agent context before continuing

#### Scenario: 关键阻塞确认超时
- **WHEN** a pending human review request reaches its timeout, its blocking level is `critical`, and its timeout behavior is `abort_if_blocking`
- **THEN** the system SHALL stop the Session as failed or safely terminated
- **AND** the system SHALL emit a terminal event that includes the unresolved critical review reason

### Requirement: 待确认问题分类闭环

Host Agent SHALL classify candidate open questions before finalizing the Session so that only unresolved or timed-out items remain in `open_questions`.

#### Scenario: 使用已有上下文解决问题
- **WHEN** a candidate question can be answered from project context, role outputs, knowledge references, or prior human review responses
- **THEN** the system SHALL incorporate the answer into the relevant conclusion, risk, or decision
- **AND** the question SHALL NOT be included in final `open_questions`

#### Scenario: 将非阻塞后续工作转为行动项
- **WHEN** a candidate question describes follow-up execution work instead of a decision blocker
- **THEN** the system SHALL convert it into an action item with owner, priority, and status
- **AND** the question SHALL NOT be included in final `open_questions`

#### Scenario: 保留真正未解决问题
- **WHEN** a candidate question cannot be answered and has no resolved human review response
- **THEN** the system SHALL include it in final `open_questions`
- **AND** the item SHALL include source, blocking level, impact, and unresolved status when that metadata is available

### Requirement: 行动项语义边界

The system SHALL generate action items only for follow-up work that has enough decision context to execute.

#### Scenario: 生成可执行行动项
- **WHEN** `generate_actions` runs after judgement and question classification
- **THEN** each action item SHALL describe a concrete follow-up task
- **AND** each action item SHALL include at least title, owner, priority, and status

#### Scenario: 避免把待决问题当作行动项
- **WHEN** a proposed action depends on an unresolved human review question
- **THEN** the system SHALL either link the action to that unresolved question or keep the item in `open_questions`
- **AND** the system SHALL NOT present it as an unconditional executable action

### Requirement: 人工确认事件兼容性

The backend SHALL expose human review lifecycle events through the existing SSE event stream.

#### Scenario: 推送人工确认生命周期事件
- **WHEN** a human review request is created, resolved, or timed out
- **THEN** `GET /sessions/{session_id}/events` SHALL stream the corresponding event in persisted sequence order
- **AND** existing session completion and failure event behavior SHALL remain compatible

#### Scenario: 查询已暂停 Session
- **WHEN** the client queries a Session paused for human review
- **THEN** the Session response SHALL expose status `paused`
- **AND** the client SHALL be able to recover the pending review request from persisted data or replayed events

### Requirement: LLM 超时可配置

LLM Gateway SHALL 支持从环境变量配置调用超时。

#### Scenario: 读取超时配置
- **WHEN** 环境变量 `ASTRA_LLM_TIMEOUT` 存在
- **THEN** Gateway SHALL 使用该值（秒）作为 httpx 超时
- **AND** 未配置时 SHALL 默认 60 秒

### Requirement: 交叉辩论过程事件

后端 SHALL 在交叉辩论阶段持久化结构化辩论过程事件，使客户端能够通过现有 Session 事件流回放角色交锋、主持人收束和辩论结论。

#### Scenario: 开始交叉辩论
- **WHEN** Host Agent 决策进入 `debate` 阶段
- **THEN** 系统 SHALL 写入 `stage_started` 事件并标记 stage 为 `debate`
- **AND** 系统 SHALL 写入 `debate_started` 事件
- **AND** `debate_started` payload SHALL 包含参与角色、争议焦点和计划轮次

#### Scenario: 写入单轮辩论发言
- **WHEN** 任一参与角色在交叉辩论中产生观点或回应
- **THEN** 系统 SHALL 写入 `debate_round` 事件
- **AND** payload SHALL 包含 `round_index`、`speaker_role_code`、`stance`、`claim`、`model_used` 和 `stage`
- **AND** 当该发言回应另一角色时，payload SHALL 包含 `responds_to_role_code`
- **AND** 当模型提供证据、风险或让步信息时，payload SHALL 保留为结构化字段

#### Scenario: 写入主持人收束
- **WHEN** 主持人在辩论轮次后判断分歧、共识或下一轮焦点
- **THEN** 系统 SHALL 写入 `debate_moderated` 事件
- **AND** payload SHALL 包含主持人判断、已形成共识、未解决分歧和下一步动作

#### Scenario: 完成交叉辩论
- **WHEN** 交叉辩论阶段完成
- **THEN** 系统 SHALL 写入 `debate_completed` 事件
- **AND** payload SHALL 包含辩论摘要、关键分歧、收敛结论和后续裁决输入
- **AND** 系统 SHALL 继续写入 `stage_completed` 事件并标记 stage 为 `debate`

### Requirement: 辩论事件兼容性

后端 SHALL 保持交叉辩论过程事件与现有 `SessionEvent`、SSE、历史 Session 和本地 fallback 行为兼容。

#### Scenario: 通过现有 SSE 推送辩论事件
- **WHEN** 客户端订阅 `GET /sessions/{session_id}/events`
- **THEN** 系统 SHALL 按持久化 `sequence` 顺序推送 `debate_started`、`debate_round`、`debate_moderated` 和 `debate_completed` 事件
- **AND** 事件格式 SHALL 与现有 `SessionEventRead` 响应结构兼容

#### Scenario: 保留旧客户端可读事件
- **WHEN** 系统生成结构化辩论过程事件
- **THEN** 系统 SHALL 保留现有阶段完成和必要的汇总性发言事件
- **AND** 未识别新辩论事件的旧客户端 SHALL 仍可通过 `agent_message`、`conflict_detected` 或 `stage_completed` 理解研讨结果

#### Scenario: 模型不可用时生成确定性辩论过程
- **WHEN** 远程模型不可用或辩论输出无法解析
- **THEN** LLM Gateway SHALL 通过本地 fallback 生成可解析的辩论轮次和主持人收束数据
- **AND** Session SHALL 继续推进到裁决和总结阶段
