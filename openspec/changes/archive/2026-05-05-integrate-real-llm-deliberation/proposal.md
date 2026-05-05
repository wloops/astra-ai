## Why

当前 LLM Gateway 在未配置真实模型时使用硬编码 fallback 是合理设计，但 `detect_conflict`、`debate`、`judge_and_summarize`、`generate_actions` 四个核心审议阶段完全没有调用 Gateway，直接返回写死的演示数据。这意味着"多 Agent 协同审议"目前只是一个空转的结构性演示，无法产出任何真正的 AI 推理结果。需要让这些阶段真正接入 LLM，使 Astra 具备名副其实的 AI 审议能力。

## What Changes

- 重构 `LLMGateway.complete_structured`，按阶段（stage）注入专用 prompt，让不同阶段获得不同风格的结构化输出。
- 修复 `_complete_remote`：将 LLM 返回的 JSON 正确解析为结构化字段（summary、stance、risks、open_questions、actions），而非全部丢进 summary。
- 重构 orchestrator 的 `detect_conflict` 阶段：从 `independent_review` 产出的角色观点中调用 Gateway 识别争议点。
- 重构 orchestrator 的 `debate` 阶段：将争议点和角色观点输入 Gateway，产出交叉辩论的归纳结论。
- 重构 orchestrator 的 `judge_and_summarize` 阶段：将全部角色观点、争议、风险输入 Gateway，产出最终结论（替换硬编码 `final_conclusion`）。
- 重构 orchestrator 的 `generate_actions` 阶段：将最终结论输入 Gateway，产出结构化行动项。
- 保留本地 fallback 路径：未配置模型时，Gateway `_complete_local` 作为确定性兜底，保证演示闭环仍可运行。

## Capabilities

### New Capabilities

无。本次变更不引入新的 capability 类别，所有改动限定在现有 `backend-agent-session` 内部。

### Modified Capabilities

- `backend-agent-session`: LangGraph 审议阶段（detect_conflict、debate、judge_and_summarize、generate_actions）的行为从硬编码改为 LLM 驱动；LLM Gateway 的结构化输出语义增强。

## Impact

- 影响 `apps/api/src/astra_api/llm_gateway.py`（重构 complete_structured、_complete_remote、_complete_local）。
- 影响 `apps/api/src/astra_api/orchestrator.py`（重构 detect_conflict、debate、judge_and_summarize、generate_actions 四个节点）。
- API 接口不变；SessionEvent 和 SessionResult 的数据结构不变；前端无需改动。
- 需新增环境变量或扩展现有 `ASTRA_LLM_BASE_URL`/`ASTRA_LLM_API_KEY` 的文档说明。
- 本地 fallback 保持兼容，未配置模型时 session 仍可完成。
