## Context

Astra AI 当前已经具备智能研讨 Session、Host Agent 阶段推进、`debate` 阶段、`conflict_detected` 事件、`agent_message` 事件和 Workspace SSE 展示。问题在于交叉辩论阶段仍被实现为一段压缩后的单 Agent 输出，用户只能看到辩论结果，难以看到角色之间如何提出异议、回应约束、收敛共识。

本设计沿用现有架构边界：所有模型调用继续通过 `LLMGateway`，实时展示继续通过持久化 `SessionEvent` + `GET /sessions/{session_id}/events` SSE 流，前端继续在 Workspace 内消费事件并从事件流恢复状态。

## Goals / Non-Goals

**Goals:**

- 让交叉辩论阶段产生可回放、可测试、可展示的过程事件。
- 前端按辩论轮次展示角色观点、回应对象、主持人收束和阶段结果。
- 保持历史 Session、旧事件类型和现有 SSE 消费兼容。
- 保持本地 fallback 可用，模型不可用时仍能生成可演示的辩论过程。

**Non-Goals:**

- 不新增独立的辩论实时 API 或 WebSocket 通道。
- 不引入多模型强制并发或新的外部依赖。
- 不改变 Session 创建、查询、结果读取的 REST URL。
- 不把最终裁决页改造成完整审计系统；本次只提供关键辩论过程追溯。

## Decisions

1. 使用新的结构化事件表达辩论过程。

   后端新增或等价支持 `debate_started`、`debate_round`、`debate_moderated`、`debate_completed` 事件。`debate_round` payload 包含 `round_index`、`speaker_role_code`、`responds_to_role_code`、`stance`、`claim`、`evidence`、`risk`、`concession`、`model_used` 等字段；`debate_moderated` payload 包含主持人对本轮分歧、共识、下一轮焦点或收束判断。

   选择事件化而不是把所有过程塞入单个 `agent_message`，是因为前端需要可增量展示、刷新后恢复和按轮次分组；同时事件化与现有 SSE 模型一致。

2. 保留完整 `agent_message` 兼容事件。

   为兼容已有前端和历史数据，`debate` 阶段仍可写入汇总性的 `agent_message` 或 `stage_completed` payload，但新 UI 优先读取结构化辩论事件。旧 Session 缺少辩论事件时，Workspace 回退展示现有普通发言。

3. 辩论编排放在 orchestrator 层，输出生成仍走 LLM Gateway。

   Orchestrator 负责选择参与辩论的角色、轮次、事件写入和阶段推进；`LLMGateway` 负责生成单轮结构化输出和主持人收束输出。这样不会绕过统一模型网关，也避免把流程状态塞进 gateway。

4. 前端从事件流派生辩论视图。

   Workspace 根据事件序列构建 `DebateThread` 视图模型，不新增轮询接口。刷新页面后，已持久化事件按 `sequence` 重放即可恢复辩论视图。结果页只展示关键辩论摘要或入口，避免和 Workspace 的过程视图重复。

## Risks / Trade-offs

- [Risk] 事件类型增加后前端类型和 SSE 白名单遗漏，导致新事件被丢弃。→ 同步更新 `SessionEventType`、事件订阅白名单和 Workspace 测试。
- [Risk] 真实模型输出不稳定，可能缺失辩论字段。→ Gateway 归一化缺失字段，并在解析失败时生成确定性 fallback 轮次。
- [Risk] 辩论过程事件过多影响页面可读性。→ 前端按轮次折叠/分组展示，默认突出关键结论和主持人收束。
- [Risk] 历史 Session 没有新事件。→ 前端以普通 `agent_message` / `conflict_detected` 作为兼容展示，不把缺失事件视为错误。
- [Risk] 结果页引用辩论过程会扩大 `SessionResult` 结构。→ 优先从事件流派生展示；只有需要持久化关键摘要时再扩展结果字段。

## Migration Plan

1. 扩展后端事件枚举、schema 和 SSE 允许类型。
2. 在 `debate` 阶段写入结构化辩论过程事件，并保留现有完成事件。
3. 扩展 Gateway 的辩论输出归一化和本地 fallback。
4. 更新前端事件类型、事件订阅和 Workspace 辩论过程视图。
5. 补充后端 pytest 和前端 Vitest，覆盖新事件、回放恢复和旧事件兼容。
6. 部署后无需数据迁移；历史 Session 使用兼容展示。

## Open Questions

- 辩论轮次默认是一轮还是由 Host Agent 根据冲突复杂度决定，需要在实现时结合现有 `host_hints` 和测试成本取最小可行策略。
- 结果页是否需要持久化 `debate_highlights` 字段，还是完全从事件流派生，建议实现时先用事件派生以降低数据模型变更范围。
