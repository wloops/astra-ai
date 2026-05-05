## 1. SSE 重连与心跳

- [x] 1.1 在 `events.ts` 中实现 `subscribeWithRetry` 函数：管理重连状态机（指数退避 1/2/4/8/16s，最多 5 次）。
- [x] 1.2 新增 30s 心跳定时器：每次收到事件时重置，超时后回调通知调用方。
- [x] 1.3 更新 `Workspace.tsx` 使用新订阅函数，展示重连状态和心跳提示。
- [x] 1.4 重连成功后自动清除临时错误提示，继续展示事件流。

## 2. LLM Gateway 增强

- [x] 2.1 `_complete_remote` 增加重试逻辑：捕获 `TimeoutException`/`ConnectError`/HTTP 5xx，重试最多 2 次间隔 1s。
- [x] 2.2 HTTP 4xx（401/403 等）不重试、不 fallback，直接抛出异常。
- [x] 2.3 增加 `logging` 输出：每次调用记录 stage、role、耗时 ms、结果（success/fallback/retry_N/error）。
- [x] 2.4 `config.py` 增加 `ASTRA_LLM_TIMEOUT` 环境变量（默认 60），Gateway 读取使用。

## 3. 错误展示统一

- [x] 3.1 创建 `components/common/ErrorBanner.tsx` 通用错误横幅组件（红色背景、关闭按钮、可选重试按钮）。
- [x] 3.2 Dashboard 加载失败时展示 ErrorBanner + 重试按钮。
- [x] 3.3 SessionHistory 加载失败时展示 ErrorBanner。
- [x] 3.4 ProjectContext 加载失败时展示 ErrorBanner，新建失败用 ErrorBanner 替换 `alert()`。
- [x] 3.5 RoleConfig 加载失败时展示 ErrorBanner，新建失败用 ErrorBanner 替换 `alert()`。

## 4. 验证

- [x] 4.1 运行 `npm --prefix apps/web run build` 确认编译通过。
- [x] 4.2 运行 `npm run test:api` 确认后端测试无回归。
- [x] 4.3 手动模拟 SSE 断连（关闭后端）验证重连和心跳提示。
- [x] 4.4 手动模拟后端不可用验证各页面错误横幅。
- [x] 4.5 运行 `openspec validate enhance-stability-and-error-handling --strict`。
