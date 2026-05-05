## Context

稳定性审查发现 5 类问题：SSE 无应用层重连、LLM Gateway 静默 fallback 不可观测、列表页 API 失败无反馈、新建操作使用 alert()、LLM 调用无日志。本次聚焦前三类，后两类附带处理。

## Goals / Non-Goals

**Goals:**
- SSE 订阅支持指数退避重连（最多 5 次），重连后自动清除临时错误提示。
- SSE 超过 30s 无事件时展示连接状态提示。
- LLM Gateway `_complete_remote` 支持重试（2 次），仅对网络超时和 5xx；401/403 抛出异常。
- LLM Gateway 增加 `logging` 输出每次调用的 stage/role/耗时/状态。
- 四个列表页 API 加载失败时展示内联错误提示（替换静默 catch）。
- 新建操作的 `alert()` 改为内联错误提示。
- 新增 `ErrorBanner` 通用组件。

**Non-Goals:**
- 不做后端 orchestror 阶段级重试/部分恢复。
- 不做全局异常处理中间件。
- 不做 sentry/log 聚合集成。
- 不做前端 ErrorBoundary React 组件（页面级 catch 已足够）。

## Decisions

### 1. SSE 重连：手动 EventSource 替换

**决策**：封装 `subscribeWithRetry` 函数，内部管理重连状态机。不使用 `EventSource` 的自动重连，而是手动创建/销毁 EventSource 实例来控制重连策略。

**重连策略**：指数退避 1s → 2s → 4s → 8s → 16s，最多 5 次。超过上限后展示"连接失败"并停止重连。重连成功后重置计数器。

**理由**：浏览器 `EventSource` 自动重连间隔不可控（通常 3s），且无法注入业务逻辑（如重连前补拉事件、重连成功回调）。

### 2. SSE 心跳：前端定时器

**决策**：在 SSE 连接成功后启动 30s 定时器，每次收到事件时重置定时器。超时后设置 `"连接可能已中断"` 提示。

**理由**：后端 SSE 流在无事件时保持连接但不推送数据。心跳检测可以在 UI 层告知用户"无事件"vs"已断连"的区别。

### 3. LLM Gateway 重试：仅网络/服务端错误

**决策**：仅对 `httpx.TimeoutException`、`httpx.ConnectError`、HTTP 5xx 重试 2 次（间隔 1s）。HTTP 4xx（鉴权失败/参数错误/模型不存在）不重试，直接抛出。

**理由**：4xx 错误重试无意义，应立即失败并通知用户。5xx/网络错误可能是暂时的。

### 4. LLM Gateway 日志：使用 Python logging

**决策**：在 Gateway 模块内 `logger = logging.getLogger(__name__)`，INFO 记录调用开始，WARNING 记录重试，ERROR 记录最终失败。不在本次引入结构化日志框架。

### 5. 前端错误状态：ErrorBanner 组件 + useState

**决策**：创建 `ErrorBanner` 通用组件（红色横幅，支持关闭）。各页面用 `useState<string | null>` 管理错误文案，catch 后 `setError(msg)` 并渲染 ErrorBanner。替换所有 `alert()` 为内联错误。

## Risks / Trade-offs

- **SSE 重连期间事件丢失** → 可接受：重连后新 EventSource 从 `lastEventId` 续订，后端根据数据库中的事件序列推送遗漏数据。
- **LLM 重试增加延迟** → 总重试 2 次 + 每次 1s 间隔 = 最多增加 ~3s。可通过 `ASTRA_LLM_TIMEOUT` 控制总时长。
- **logging 无持久化** → 当前仅控制台输出，后续可对接文件 handler。本次够用。
