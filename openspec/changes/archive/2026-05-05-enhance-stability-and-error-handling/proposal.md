## Why

核心演示链路虽已全通，但稳定性审查发现若干短板：SSE 断连后无应用层重连（依赖浏览器默认行为不可靠）、LLM Gateway 所有远程失败静默 fallback 到本地 mock（无法运维排障）、Dashboard/SessionHistory/RoleConfig/ProjectContext 四个列表页 API 失败时静默无反馈、新建操作使用 `alert()` 弹窗体验差。这些在实时演示或评审场景下会直接导致"掉链子"。需要在进入下一步开发前将稳定性基线抬起来。

## What Changes

### 前端 SSE 重连
- SSE 订阅增加应用层重连：指数退避（1s → 2s → 4s → 8s，最多 5 次），重连成功后自动清除临时错误提示。
- 新增 SSE 连接心跳检测：超过 30 秒无事件时显示"连接可能已中断"提示。
- 重连期间保留已收到的事件不丢失，UI 展示"重新连接中…"状态。

### LLM Gateway 增强
- `_complete_remote` 增加重试（最多 2 次，间隔 1s），仅对网络超时和 5xx 重试。
- HTTP 401/403 鉴权错误不再 fallback 到本地 mock，改为抛出明确异常让 Session 标记 failed（避免静默跑假数据）。
- 增加 Python `logging` 输出，记录每次 LLM 调用的 stage、role、耗时和结果状态。
- `timeout` 改为从环境变量 `ASTRA_LLM_TIMEOUT` 读取（默认 60s）。

### 前端错误状态统一
- Dashboard、SessionHistory、RoleConfig、ProjectContext 四个列表页增加 API 加载失败的内联错误提示（替换静默 catch）。
- 新建操作的 `alert()` 改为页面内嵌错误提示。
- 新增 `ErrorBanner` 通用组件，统一错误展示样式。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `backend-agent-session`: LLM Gateway 增加重试、日志、错误分类行为。
- `web-demo-session-flow`: SSE 重连、心跳检测、列表页错误状态展现。

## Impact

- 影响 `apps/web/src/api/events.ts`（SSE 重连逻辑）。
- 影响 `apps/web/src/pages/Workspace.tsx`（SSE 状态展示）。
- 影响 `apps/api/src/astra_api/llm_gateway.py`（重试+日志+错误分类）。
- 影响 `apps/api/src/astra_api/config.py`（+ASTRA_LLM_TIMEOUT 配置）。
- 影响 `apps/web/src/pages/Dashboard.tsx`、`SessionHistory.tsx`、`ProjectContext.tsx`、`RoleConfig.tsx`（错误状态）。
- 新增 `apps/web/src/components/common/ErrorBanner.tsx`。
- 无 API 契约变更。
