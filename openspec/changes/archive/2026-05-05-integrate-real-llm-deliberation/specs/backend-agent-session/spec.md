## MODIFIED Requirements

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
