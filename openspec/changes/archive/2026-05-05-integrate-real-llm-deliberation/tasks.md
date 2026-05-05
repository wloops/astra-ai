## 1. LLM Gateway 重构

- [x] 1.1 为 `complete_structured` 增加按阶段（stage）分发的 prompt 模板字典，每个阶段有专用的 system prompt 和 output JSON schema。
- [x] 1.2 重写 `_complete_remote`：从 LLM 返回的 JSON content 中提取 `summary`、`stance`、`risks`、`open_questions`、`actions` 字段，缺失字段补默认值，解析失败回退到 `_complete_local`。
- [x] 1.3 丰富 `_complete_local`：为 `detect_conflict`、`debate`、`judge_and_summarize`、`generate_actions` 四个阶段补齐确定性 fallback 响应。

## 2. Orchestrator 审议阶段重构

- [x] 2.1 重构 `detect_conflict`：从 `role_outputs` 构建上下文，调用 `gateway.complete_structured(stage="detect_conflict")`，用 LLM 返回的 `conflicts` 替换硬编码数据。
- [x] 2.2 重构 `debate`：将 `conflicts` 和 `role_outputs` 传入 Gateway，用 LLM 返回的辩论总结替换硬编码 `agent_message`。
- [x] 2.3 重构 `judge_and_summarize`：汇总 `role_outputs`、`conflicts`、`risks`、`open_questions` 传入 Gateway，用 LLM 返回的 `final_conclusion` 替换硬编码字符串；更新 `risks` 和 `open_questions`。
- [x] 2.4 重构 `generate_actions`：将 `final_conclusion`、`risks`、`open_questions` 传入 Gateway，用 LLM 返回的 `actions` 替换硬编码行动项。

## 3. 环境配置与文档

- [x] 3.1 在 `apps/api` 文档（README 或 .env.example）中说明 `ASTRA_LLM_BASE_URL`、`ASTRA_LLM_API_KEY`、`ASTRA_LLM_MODEL` 的配置方式。
- [x] 3.2 更新根目录 README，说明如何配置真实 LLM 以启用 AI 审议能力。

## 4. 验证

- [x] 4.1 补充 pytest：验证 LLM Gateway 按阶段 prompt 分发和 JSON 解析逻辑。
- [x] 4.2 补充 pytest：验证 orchestrator 审议阶段在本地 fallback 模式下仍可完成完整 Session 流程。
- [x] 4.3 运行后端现有测试，确认无回归。
- [x] 4.4 启动前后端，手动验证配置真实 LLM 后研讨流程产出真正的 AI 推理结果。
