## Why

当前研讨流程会把 Agent 提出的待确认问题和行动项直接沉淀到结果页，但会议过程中没有逐条分类、追问、裁决或人工确认的闭环。这会导致结果页堆积大量本应在会议阶段敲定的问题，用户难以判断哪些是已决条件、哪些是真正需要人工补充的信息。

本次变更引入会议中的问题消化与人工确认机制，让 Host Agent 在自动研讨、人工输入和超时沉淀之间做清晰分流，使最终结论、待确认问题和行动项具备更可信的语义边界。

## What Changes

- 后端 Host Agent 决策动作新增人工确认分支，用于在会议中请求用户确认关键口径、业务规则或授权判断。
- 后端新增人工确认事件、待确认请求状态和超时处理规则：用户响应后回灌研讨上下文，超时后将问题标记为未确认并继续推进。
- Host Agent 需要对 open questions 做分类：可由现有上下文解决的问题在会议内处理；需要用户事实输入的问题触发人工确认；非阻塞后续工作转为行动项。
- `open_questions` 仅保留会议内无法解决或人工确认超时的问题，并附带来源、阻塞级别和影响说明。
- `actions` 仅保留已明确需要执行的后续任务，不再混入仍需决策的问题。
- 前端会议进行页展示人工确认弹窗，支持提交回答、跳过/超时，并在事件流中展示确认状态。
- 前端结果页区分已确认决策、未确认问题和行动项，避免把所有问题以同一种列表形式展示。

## Capabilities

### New Capabilities

<!-- 本变更不新增独立 capability；它扩展现有会议编排与前端会议流能力。 -->

### Modified Capabilities

- `backend-agent-session`: 增加人工确认决策、问题分类闭环、确认超时和结果语义边界要求。
- `web-demo-session-flow`: 增加会议中人工确认弹窗、确认事件展示，以及结果页对待确认问题/行动项的区分展示。

## Impact

- 后端影响 `apps/api/src/astra_api/orchestrator.py`、`apps/api/src/astra_api/llm_gateway.py`、`apps/api/src/astra_api/models.py`、`apps/api/src/astra_api/main.py` 和相关 pytest。
- 前端影响 `apps/web/src/pages/Workspace.tsx`、`apps/web/src/pages/SessionResult.tsx`、`apps/web/src/api/types.ts`、`apps/web/src/api/client.ts`、`apps/web/src/api/events.ts` 和相关 Vitest。
- API 可能新增人工确认响应端点，例如 `POST /sessions/{session_id}/human-reviews/{review_id}/respond`。
- SSE 事件类型需要新增人工确认请求、响应和超时事件；现有事件消费逻辑需要保持兼容。
- 不引入新的模型调用通道，所有 Host 决策和阶段输出仍通过 LLM Gateway。
