## Context

当前 `LLMGateway` 已具备 `complete_structured` 入口和远程/本地双路径。`independent_review` 阶段正确逐角色调用了 Gateway，产生了观点数据。但 `detect_conflict`、`debate`、`judge_and_summarize`、`generate_actions` 四个阶段完全绕过 Gateway 直接返回硬编码值。`_complete_remote` 也只返回 `summary` 字段，其他结构化字段被丢弃。

本次设计需要让这四个阶段真正消费 LLM 输出，同时保留本地 fallback 作为未配置模型时的演示兜底。

## Goals / Non-Goals

**Goals:**
- 所有审议阶段（detect_conflict、debate、judge_and_summarize、generate_actions）均通过 LLM Gateway 产出推理结果。
- `_complete_remote` 正确解析 LLM 返回的 JSON 到结构化字段。
- 每个阶段有专用的 prompt 模板，控制输出风格和结构。
- 本地 fallback 仍保证完整 Session 可跑通。

**Non-Goals:**
- 不引入多模型路由（单模型 Gateway 不变）。
- 不修改数据库 schema 或 API 契约。
- 不在本次引入 tool calling / function calling。
- 不做 prompt 缓存或流式输出优化。
- 不修改前端。

## Decisions

### 1. Gateway 按阶段注入专用 prompt 模板

**决策**：`complete_structured` 方法根据 `stage` 参数选择不同的 system prompt 和输出 JSON schema，而非使用通用 prompt。

**理由**：不同阶段需要不同的输出格式。`detect_conflict` 需要识别争议点并标注支持方/审慎方，`judge_and_summarize` 需要综合全部信息产出最终结论。统一 prompt 无法满足这些需求。

**备选**：在 orchestrator 层拼 prompt → 拒绝，因为 prompt 管理应集中在 Gateway，orchestrator 只传上下文数据。

### 2. _complete_remote 正确解析 JSON

**决策**：`_complete_remote` 从 LLM 返回的 JSON content 中提取 `summary`、`stance`、`risks`、`open_questions`、`actions` 字段，做类型校验后返回完整 dict。失败时回退到 `_complete_local`。

**理由**：当前第 54 行把所有内容塞进 `summary` 是错误实现，LLM 实际返回了结构化字段但被丢弃。

**备选**：使用 LLM 的 JSON mode / structured outputs → 暂不采用，因为不同 LLM provider 的 JSON mode 实现不一，先做通用 JSON 解析。

### 3. detect_conflict 基于 role_outputs 调用 LLM 识别争议

**决策**：`detect_conflict` 将 `independent_review` 产出的 `role_outputs`（包含各角色的 summary、stance、risks、open_questions）传入 Gateway，由 LLM 识别观点冲突点，返回结构化争议列表。

**输入**：所有角色的观点摘要。
**输出**：`[{title, supporting_view, cautious_view, judgement}]`。

### 4. debate 基于争议点和角色观点生成辩论总结

**决策**：`debate` 将 `conflicts` 和 `role_outputs` 传入 Gateway，由 LLM 产生交叉辩论的归纳结论。

**输入**：争议列表 + 各角色观点。
**输出**：辩论总结文本，作为 `agent_message` 事件 payload。

### 5. judge_and_summarize 基于全量信息产出最终结论

**决策**：`judge_and_summarize` 汇总 `role_outputs`、`conflicts`、`risks`、`open_questions`，传入 Gateway 产出 `final_conclusion`。替换当前第 189 行的硬编码字符串。

**输入**：全部研讨中间数据（角色观点、争议、风险、待确认问题）。
**输出**：最终结论文本 + 更新后的 risks、open_questions。

### 6. generate_actions 基于结论产出行动项

**决策**：`generate_actions` 将 `final_conclusion`、`risks`、`open_questions` 传入 Gateway，产出结构化行动项。

**输入**：最终结论、风险列表、待确认问题。
**输出**：`[{title, owner, priority, status}]`。

### 7. 本地 fallback 策略

**决策**：保留 `_complete_local` 确定性 fallback。当 `_complete_remote` 失败或未配置模型时自动回退，保证 Session 仍可完成。本地 fallback 的 prompt 路径与远程一致（同样按 stage 分发），只是返回确定性数据。

## Risks / Trade-offs

- **LLM 响应不稳定** → `_complete_remote` 解析 JSON 失败时自动回退到 `_complete_local`，保证 Session 不中断。
- **LLM 调用耗时** → 当前各阶段已有 `_stage_pause(0.1s)`，LLM 调用是同步等待，无需额外处理。后续可考虑超时控制。
- **Prompt 质量直接影响审议质量** → 初期提供中文 prompt 模板作为合理起点，后续可通过配置或 seed 数据自定义。
- **本地 fallback 数据仍为写死值** → 可接受，本地 fallback 本身就是演示兜底。
