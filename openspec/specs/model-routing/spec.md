# model-routing Specification

## Purpose
TBD - created by archiving change add-multi-model-routing. Update Purpose after archive.
## Requirements
### Requirement: 模型花名册配置

系统 SHALL 通过 `ASTRA_LLM_MODEL_PROFILES` 环境变量（JSON 格式）定义可用的模型花名册，每个 profile 包含 `model` 名称及可选的 `base_url` 和 `api_key`。

#### Scenario: 配置多个模型 profile
- **WHEN** 管理员设置 `ASTRA_LLM_MODEL_PROFILES='{"default":{"model":"gpt-4o-mini"},"strong":{"model":"gpt-4o"}}'`
- **THEN** 系统 SHALL 解析出两个可用 profile：`default` 和 `strong`
- **AND** 未指定 base_url/api_key 的 profile SHALL 继承全局 `ASTRA_LLM_BASE_URL` 和 `ASTRA_LLM_API_KEY`

#### Scenario: 未配置 profiles 时向后兼容
- **WHEN** `ASTRA_LLM_MODEL_PROFILES` 未设置或为空
- **THEN** 系统 SHALL 使用现有 `ASTRA_LLM_MODEL` 作为唯一可用模型
- **AND** 行为与变更前完全一致

### Requirement: Stage 路由配置

系统 SHALL 通过 `ASTRA_LLM_STAGE_ROUTING` 环境变量（JSON 格式）配置阶段到模型 profile 的默认映射。

#### Scenario: 配置阶段路由
- **WHEN** 管理员设置 `ASTRA_LLM_STAGE_ROUTING='{"debate":"strong","judge_and_summarize":"strong"}'`
- **THEN** 辩论和裁决总结阶段 SHALL 默认使用 `strong` profile
- **AND** 其他未映射阶段 SHALL 使用 `default` profile 或全局 `ASTRA_LLM_MODEL`

### Requirement: Role 路由配置

系统 SHALL 通过 `ASTRA_LLM_ROLE_ROUTING` 环境变量（JSON 格式）配置角色到模型 profile 的默认映射。Role 路由优先级高于 Stage 路由。

#### Scenario: 配置角色路由覆盖阶段路由
- **WHEN** Stage 路由配置 `debate` 使用 `strong`，Role 路由配置 `host` 使用 `claude`
- **THEN** host 角色在 debate 阶段 SHALL 使用 `claude` profile
- **AND** 其他角色在 debate 阶段 SHALL 使用 `strong` profile

### Requirement: 模型解析优先级

LLMGateway SHALL 按以下优先级解析实际使用的模型：Session 级覆盖 > Role 路由 > Stage 路由 > Default profile > `ASTRA_LLM_MODEL`。

#### Scenario: Session 级覆盖优先
- **WHEN** 用户发起研讨时指定 `model_overrides={"debate": "claude-opus"}`
- **THEN** debate 阶段 SHALL 使用 `claude-opus`，忽略 Stage/Role 路由配置

#### Scenario: 无覆盖时使用路由配置
- **WHEN** Session 无 model_overrides 且 Stage 路由配置 debate 使用 `strong`
- **THEN** debate 阶段 SHALL 使用 `strong` profile

#### Scenario: 无任何配置时使用单模型
- **WHEN** 无 profiles、无路由、无覆盖
- **THEN** Gateway SHALL 使用 `ASTRA_LLM_MODEL` + `ASTRA_LLM_BASE_URL` + `ASTRA_LLM_API_KEY`

### Requirement: Session 级模型覆盖

系统 SHALL 在创建研讨 Session 时接受 `model_overrides` 字段，存储用户对特定阶段的模型选择。

#### Scenario: 创建 Session 时指定模型覆盖
- **WHEN** 客户端 POST `/sessions` 含 `{"model_overrides": {"debate": "claude-opus", "judge_and_summarize": "claude-opus"}}`
- **THEN** Session SHALL 持久化 `model_overrides` 字段
- **AND** 后续所有阶段 SHALL 使用覆盖的模型

#### Scenario: 未指定时为空
- **WHEN** 客户端 POST `/sessions` 不含 `model_overrides`
- **THEN** Session `model_overrides` SHALL 默认为空 `{}`
- **AND** Gateway SHALL 使用 Role/Stage 路由或默认模型

### Requirement: 模型花名册查询端点

系统 SHALL 提供 `GET /models/profiles` 端点，返回可用模型花名册（脱敏，不包含 api_key）。

#### Scenario: 查询花名册
- **WHEN** 客户端 GET `/models/profiles`
- **THEN** 系统 SHALL 返回 profile 列表，每个包含 name、model、base_url（脱敏域名）
- **AND** SHALL 不返回 api_key 字段

#### Scenario: 未配置 profiles
- **WHEN** 无 `ASTRA_LLM_MODEL_PROFILES` 配置
- **THEN** SHALL 返回仅含一个基于 `ASTRA_LLM_MODEL` 构造的默认 profile

### Requirement: 模型连通性测试端点

系统 SHALL 提供 `POST /models/test` 端点，向指定 profile 发送最小化请求验证连通性。

#### Scenario: 测试成功
- **WHEN** 客户端 POST `/models/test` 含 `{"profile_name": "strong"}`
- **THEN** 系统 SHALL 向该 profile 的 API 发送测试请求
- **AND** 返回 `{"profile_name": "strong", "status": "ok", "latency_ms": 234}`

#### Scenario: 测试失败
- **WHEN** profile 的 API 不可达或返回错误
- **THEN** 系统 SHALL 返回 `{"profile_name": "strong", "status": "error", "error": "Connection timeout"}`

#### Scenario: profile 不存在
- **WHEN** 客户端测试不存在的 profile name
- **THEN** 系统 SHALL 返回 HTTP 404

### Requirement: 前端模型选择面板

前端 StartSession 页面 SHALL 展示每个研讨阶段的当前默认模型，并允许用户从花名册中选择覆盖。

#### Scenario: 展示模型配置
- **WHEN** 用户进入发起研讨页面
- **THEN** 页面 SHALL 从 `GET /models/profiles` 获取花名册
- **AND** SHALL 以表格形式展示每个阶段及其当前模型（标注来自哪个来源：default/stage路由/role路由）

#### Scenario: 用户覆盖模型
- **WHEN** 用户在某阶段的模型下拉中选择不同模型
- **THEN** model_overrides SHALL 记录该覆盖
- **AND** 提交时 SHALL 随 Session 创建请求发送

#### Scenario: 未配置多模型时隐藏面板
- **WHEN** 仅有一个可用 profile（即仅默认单模型）
- **THEN** 模型配置区域 SHALL 折叠或隐藏，不干扰用户

### Requirement: 前端模型使用标签

前端 Workspace 页面 SHALL 在 Agent 发言旁展示当前使用的模型名称。

#### Scenario: 发言显示模型标签
- **WHEN** Agent 发言事件包含 `model_used` 字段
- **THEN** 发言卡片 SHALL 在角色名旁展示模型名称标签（如 `gpt-4o`）

#### Scenario: 无 model_used 字段时隐藏
- **WHEN** 事件不含 `model_used`（如旧数据或 fallback 模式）
- **THEN** 发言卡片 SHALL 不展示模型标签

### Requirement: 模型路由日志增强

Gateway SHALL 在每次 LLM 调用日志中记录实际使用的模型名称。

#### Scenario: 日志包含模型名称
- **WHEN** Gateway 执行 LLM 调用
- **THEN** 日志 SHALL 包含 `model=<model_name>`（从 profile 中提取的模型名）
- **AND** SHALL 继续记录 stage、role、elapsed_ms、status 字段

