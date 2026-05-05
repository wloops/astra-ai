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

后端 SHALL 支持创建、查询和列出智能研讨 Session。

#### Scenario: 创建研讨 Session
- **WHEN** 客户端提交项目 ID、场景 ID、议题和可选角色 ID
- **THEN** 系统 SHALL 创建研讨 Session
- **AND** SHALL 启动后台 Agent 编排流程
- **AND** SHALL 返回 Session 当前状态

#### Scenario: 查询研讨 Session
- **WHEN** 客户端请求指定 Session
- **THEN** 系统 SHALL 返回 Session 的状态、当前阶段、议题、项目 ID、场景 ID 和角色 ID

### Requirement: SSE 事件流

后端 SHALL 通过 SSE 推送研讨过程事件。

#### Scenario: 订阅 Session 事件
- **WHEN** 客户端请求 `GET /sessions/{session_id}/events`
- **THEN** 系统 SHALL 返回 `text/event-stream`
- **AND** SHALL 按顺序推送已持久化的 SessionEvent

#### Scenario: 推送阶段事件
- **WHEN** LangGraph 执行阶段节点
- **THEN** 系统 SHALL 推送阶段开始、Agent 发言、争议识别、阶段完成、Session 完成或 Session 失败事件

### Requirement: LangGraph 真实逐步运行

后端 SHALL 使用 LangGraph 按阶段真实推进智能研讨流程，核心审议阶段 SHALL 通过 LLM Gateway 产出 AI 推理结果。

#### Scenario: 执行智能研讨流程
- **WHEN** Session 被创建
- **THEN** 系统 SHALL 依次执行 `init_session`、`load_context`、`clarify_topic`、`independent_review`、`detect_conflict`、`debate`、`judge_and_summarize`、`generate_actions` 和 `finalize_minutes`
- **AND** 每个阶段 SHALL 更新 Session 状态或写入事件
- **AND** `independent_review` SHALL 为每个非 host 角色调用 LLM Gateway 产出独立观点
- **AND** `detect_conflict` SHALL 基于各角色观点调用 LLM Gateway 识别争议点
- **AND** `debate` SHALL 基于争议点和角色观点调用 LLM Gateway 产出辩论归纳
- **AND** `judge_and_summarize` SHALL 基于全部研讨中间数据调用 LLM Gateway 产出最终结论
- **AND** `generate_actions` SHALL 基于最终结论调用 LLM Gateway 产出结构化行动项

#### Scenario: 节点执行失败
- **WHEN** LangGraph 任一节点执行失败
- **THEN** 系统 SHALL 将 Session 状态更新为 `failed`
- **AND** SHALL 写入 `session_failed` 事件

#### Scenario: LLM 调用失败时回退到本地 fallback
- **WHEN** LLM 远程调用失败或未配置模型
- **THEN** Gateway SHALL 回退到 `_complete_local` 确定性响应
- **AND** Session SHALL 仍按阶段流程完成，不因 LLM 不可用而中断

### Requirement: 结构化结果沉淀

后端 SHALL 在研讨完成后生成并持久化结构化结果。

#### Scenario: 获取 Session 结果
- **WHEN** 研讨 Session 完成后客户端请求结果
- **THEN** 系统 SHALL 返回最终结论、关键争议、角色观点摘要、风险、待确认问题、行动项和 Markdown 纪要

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

后端 SHALL 通过 LLM Gateway 封装模型调用，Gateway SHALL 按阶段提供专用 prompt 工程并正确解析结构化输出。

#### Scenario: 调用单模型
- **WHEN** Agent 阶段需要模型输出
- **THEN** 系统 SHALL 通过统一 Gateway 传入角色、阶段、输入和输出要求
- **AND** Gateway SHALL 根据阶段选择对应的 system prompt 和输出 JSON schema
- **AND** Gateway SHALL 支持未来扩展多模型路由

#### Scenario: 远程模型返回结构化 JSON
- **WHEN** 远程 LLM 返回包含结构化字段的 JSON
- **THEN** Gateway SHALL 提取 `summary`、`stance`、`risks`、`open_questions`、`actions` 各字段
- **AND** SHALL 对缺失字段补默认值，不做整体 fallback
- **AND** JSON 解析失败时 SHALL 回退到本地 fallback

#### Scenario: 未配置真实模型
- **WHEN** 系统未配置模型地址或 API Key
- **THEN** Gateway SHALL 使用本地确定性 responder 推进流程
- **AND** SHALL 保证 Session 仍按阶段产生事件和结果

