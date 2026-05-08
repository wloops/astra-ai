# backend-agent-session Specification (Delta)

## Purpose

更新 LLM Gateway 规格：从单模型升级为多模型路由。

## MODIFIED Requirements

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
