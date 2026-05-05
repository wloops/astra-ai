## Context

后端 6 个测试覆盖了健康检查、种子数据、Session 完整流程和 LLM Gateway 基础调用。前端零测试。需要在不改变业务代码的前提下补充测试。

## Goals / Non-Goals

**Goals:**
- 后端测试覆盖 LLM Gateway 重试/错误分类/本地 fallback、SSE 事件推送、Session CRUD。
- 前端引入 Vitest 框架，至少覆盖 `ErrorBanner`、`apiClient` 的基础测试。
- GitHub Actions CI 自动执行 pytest + build + validate。

**Non-Goals:**
- 不做 E2E 测试（Playwright/Cypress）。
- 不做覆盖率阈值强制（本次只加测试，不设门槛）。
- 不修改业务代码来适配测试。
- 不做 Storybook/visual regression。

## Decisions

### 1. 前端测试框架：Vitest

**决策**：使用 Vitest + @testing-library/react + jsdom。Vite 项目原生支持 Vitest，配置最简单。

**备选**：Jest → 需要额外配置 ts/jsx transform，不如 Vitest 与 Vite 集成紧密。

### 2. 后端测试策略：pytest + TestClient + 真实 SQLite

**决策**：沿用现有 pytest + FastAPI TestClient + SQLite 模式。SSE 测试用 `httpx.AsyncClient.stream()` 消费 SSE 流。

### 3. CI 触发条件

**决策**：push 到 main 和所有 PR 时触发。包含 4 步：setup → pytest → vite build → openspec validate。

## Risks / Trade-offs

- **SSE 测试可能不稳定**（依赖 async 流消费时机）→ 加适当 `asyncio.sleep` 等待事件写入。
- **CI 中 SQLite 需文件系统权限** → 无问题，GitHub Actions 默认支持。
