## Why

当前会议进行页能看到 Agent 发言和最终裁决，但交叉辩论阶段的观点交锋被压缩成少量总结，用户难以判断各角色如何回应彼此、主持人如何收束分歧，以及最终结论是否来自真实讨论过程。

这次变更让辩论过程成为一等可见对象：后端持续产出可回放的辩论事件，前端按轮次、角色和主持人裁决展示完整过程。

## What Changes

- 后端在进入交叉辩论阶段时写入明确的辩论轮次事件，包括辩论开始、单轮发言、主持人收束和辩论结束。
- 辩论事件保留与现有 `SessionEvent` / SSE 流兼容的事件模型，不新增独立实时通道。
- 前端 Workspace 将辩论阶段渲染为可扫描的过程视图，展示每轮角色观点、回应对象、主持人判断和下一步流转。
- 会议历史或页面刷新后，前端可通过重放已持久化事件恢复辩论过程。
- 最终结果页可引用关键辩论过程，帮助用户追溯结论来源。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `backend-agent-session`: 补充交叉辩论阶段的结构化事件要求，确保辩论过程可持久化、可回放、可通过 SSE 消费。
- `web-demo-session-flow`: 补充会议进行页和结果页对辩论过程事件的展示要求。

## Impact

- 后端：`apps/api/src/astra_api/orchestrator.py`、`apps/api/src/astra_api/models.py`、`apps/api/src/astra_api/llm_gateway.py` 以及相关 pytest。
- 前端：`apps/web/src/api/types.ts`、`apps/web/src/api/events.ts`、Workspace 相关页面/组件以及相关 Vitest。
- API：复用现有 `GET /sessions/{session_id}/events` SSE 和持久化事件查询语义；不引入破坏性 REST API 变更。
- 数据：新增事件类型或 payload 字段需保持旧事件兼容，历史 Session 没有辩论过程事件时仍可正常展示。
