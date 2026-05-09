## Context

当前 Astra AI 的研讨流程已经具备 Host Agent 决策循环、阶段化 LLM Gateway 输出、SSE 事件流和结构化 SessionResult。现有问题在于 `open_questions` 与 `actions` 的语义过宽：Agent 在澄清、独立评审、辩论和总结阶段提出的问题会被累积到最终结果页，但系统没有在会议中对这些问题做分类、追问、人工确认或关闭。

用户期望的行为更接近真实会议：能在会议阶段研究敲定的问题应当直接形成结论；只有缺少事实输入、需要授权判断或等待人工确认超时的问题，才应沉淀为待确认问题。会议中可以弹出人工审核请求，用户响应后继续研讨，超时则把该问题纳入待确认并保留影响说明。

约束：

- 所有模型决策仍通过 `LLMGateway`，不新增绕过 Gateway 的模型调用。
- REST/SSE 合同需要兼容现有前端事件消费和完成态跳转。
- SQLite 是当前持久化后端，人工确认状态应先以简单表或 JSON 字段实现，避免引入队列/消息中间件。
- 本次设计只覆盖单个 Session 内的人工确认闭环，不处理跨 Session 审批工作流。

## Goals / Non-Goals

**Goals:**

- 让 Host Agent 对待确认问题进行分类，区分可自动解决、需要辩论、需要人工输入、可转行动项、真正未解决的问题。
- 支持会议中暂停等待人工确认，并通过 SSE 通知前端展示弹窗。
- 支持用户提交确认结果，后端将回答回灌到研讨上下文并继续推进。
- 支持确认超时：超时后不阻塞整个研讨，而是把问题标记为未确认并继续完成 Session。
- 让最终结果页中的 `open_questions` 只包含真正未解决或人工超时的问题，并带有来源、阻塞级别和影响说明。
- 让 `actions` 只包含已确定要执行的后续工作，避免混入仍需决策的问题。

**Non-Goals:**

- 不实现组织级审批流、多人会签、权限矩阵或审计审批系统。
- 不引入 WebSocket；继续使用现有 SSE + REST 响应端点。
- 不改变任务看板的核心生命周期，只保证从行动项转任务时仍可使用既有 promote 逻辑。
- 不强制所有问题都必须人工确认；Host 只对缺少事实输入或需要授权口径的问题请求人工确认。

## Decisions

### 1. 新增 Host 决策动作 `REQUEST_HUMAN_REVIEW`

**决策**：在 Host Agent 决策 schema 中新增 `REQUEST_HUMAN_REVIEW`，携带 `question`、`reason`、`blocking_level`、`options`、`default_on_timeout`、`timeout_seconds` 和 `impact`。

**理由**：人工确认是会议编排的一种动作，而不是普通阶段输出。放进 Host 决策层可以让它和 `NEXT_STAGE`、`SKIP_STAGE`、`ADD_STAGE` 一样被事件化和持久化。

**备选**：把人工确认建成一个普通 `ADD_STAGE`。缺点是状态不可表达，前端难以知道这是需要用户输入的暂停点，也难以处理超时恢复。

### 2. 用独立人工确认记录表达 pending/resolved/timeout

**决策**：新增轻量 `HumanReviewRequest` 持久化记录，或等价持久结构，至少包含：

- `id`
- `session_id`
- `question`
- `reason`
- `blocking_level`
- `options`
- `status`
- `response`
- `default_on_timeout`
- `impact`
- `requested_at`
- `expires_at`
- `resolved_at`

**理由**：人工确认需要跨 HTTP 请求和后台编排循环共享状态，不能只存在内存里。独立记录也便于测试、结果页引用和未来扩展审计。

**备选**：把确认请求塞进 `DiscussionSession` JSON 字段。短期实现更快，但会让查询、状态更新和测试更脆弱。

### 3. 暂停 Session，但不终止 SSE

**决策**：当 Host 请求人工确认时，后端将 Session 状态更新为 `paused`，写入 `human_review_requested` SSE 事件，并等待用户响应或超时。用户响应或超时后写入对应事件，Session 回到 `running` 并继续 Host 决策循环。

**理由**：现有模型已有 `PAUSED` 状态但未被使用，这正好能表达“等待用户输入”。SSE 仍然用于通知前端，REST 端点用于提交用户响应，符合现有架构。

**备选**：后台继续跑完整会议，同时把人工问题挂起。缺点是后续结论可能忽略用户回答，破坏“会议中敲定”的体验。

### 4. 明确问题分类，不让 `open_questions` 无边界累积

**决策**：Host 在 `judge_and_summarize` 或新增的问题消化阶段前，应根据当前上下文把问题分类为：

- `resolved_by_context`：已有上下文可回答，写入结论或风险控制。
- `requires_debate`：角色观点冲突，需要辩论或裁决。
- `requires_human_review`：缺少业务事实、授权口径或外部约束，需要用户确认。
- `convert_to_action`：不是决策阻塞，而是后续执行项。
- `unresolved`：无法解决且未获得人工确认，保留到结果页。

**理由**：待确认问题的价值在于“真的需要后续确认”，而不是收集所有 Agent 问过的问题。

**备选**：只在最终输出 prompt 里要求模型少列问题。缺点是不可观测、不可测试，也无法支持会议中弹窗。

### 5. 超时采用“继续研讨 + 明确降级”策略

**决策**：人工确认超时后，后端写入 `human_review_timeout` 事件，并根据 `default_on_timeout` 决定：

- `mark_open_question`：加入 `open_questions`，标注 `source=human_review_timeout` 和影响说明。
- `use_default`：采用 Host 提供的默认保守选项继续。
- `abort_if_blocking`：仅在阻塞级别为 `critical` 时允许 Session 失败或中止。

**理由**：自动研讨不应因为普通口径问题无限挂起；但高风险授权判断也不能静默通过。

**备选**：所有超时都直接进入待确认。缺点是会让高风险场景缺少明确中止语义，也会让低风险问题无法继续形成可用结论。

### 6. 结果结构兼容但增强字段语义

**决策**：尽量保持 `SessionResult.open_questions` 和 `SessionResult.actions` 字段名兼容，但允许 `open_questions` 从纯字符串逐步升级为结构化对象；前端渲染需兼容旧字符串。

建议结构：

```json
{
  "question": "30元阈值按含税还是未税计算？",
  "source": "human_review_timeout",
  "blocking_level": "medium",
  "impact": "影响自动结算规则与财务对账口径",
  "status": "unresolved"
}
```

**理由**：当前数据库字段是 JSON，前端已有兼容渲染空间。结构化能表达来源和影响，同时减少破坏性迁移。

## Risks / Trade-offs

- [Risk] 人工确认会让自动会议变慢。→ Mitigation：只对 Host 判定为缺少事实输入或授权口径的问题触发，且默认有超时策略。
- [Risk] LLM 可能滥用 `REQUEST_HUMAN_REVIEW`，频繁打断会议。→ Mitigation：在 Host prompt、normalize 和编排层限制每轮/每 Session 最大请求数，并要求 reason/impact 非空。
- [Risk] 前端弹窗关闭或页面刷新导致用户错过确认。→ Mitigation：确认请求持久化，Workspace 重新加载时从事件或 Session 状态恢复 pending 请求。
- [Risk] `open_questions` 从字符串到对象会影响旧渲染。→ Mitigation：前端和 API 类型同时兼容 string 与 object，旧数据继续按字符串展示。
- [Risk] 超时策略过于保守会产出大量待确认问题。→ Mitigation：Host 分类时先尝试 `resolved_by_context` 和 `convert_to_action`，只有真正缺事实输入的问题进入人工确认。
