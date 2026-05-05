## Why

当前后端仅 6 个测试（2 个文件），前端零测试。随着 LLM Gateway 重试逻辑、SSE 重连、多个页面的 API 接入等复杂度上升，缺乏自动化测试会导致回归风险累积——每次改动都需要全手动验证。需要在复杂度进一步膨胀前建立测试基线并引入 CI。

## What Changes

### 后端测试扩展
- 补充 LLM Gateway 单元测试：重试行为（网络超时回退、5xx 重试、4xx 抛异常）、本地 fallback 各阶段输出、超时配置。
- 补充 SSE 集成测试：事件按序列推送、completed/failed 后流正常关闭、session 不存在时错误事件。
- 补充 Session CRUD 测试：创建→查询→结果获取的完整生命周期。
- 补充 orchestrator 兜底测试：本地 fallback 模式下完整 workflow 产出事件和结果。

### 前端测试引入
- 配置 Vitest + @testing-library/react 测试框架。
- 为 `ErrorBanner`、`StatsCards` 等关键组件添加基本渲染测试。
- 为 `apiClient` 添加 mock fetch 单元测试。

### CI 流水线
- 新增 GitHub Actions workflow：`ci.yml`。
- 流程包含：checkout → 安装依赖 → 后端 pytest → 前端 build → openspec validate。
- 在 push 和 PR 时自动触发。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-demo-session-flow`: 新增自动化测试覆盖和 CI 自动验证的需求。

## Impact

- 影响 `apps/api/tests/`（新增测试文件）。
- 影响 `apps/web/`（新增 vitest 配置 + `src/**/*.test.tsx`）。
- 新增 `.github/workflows/ci.yml`。
- 可能需要 `apps/web/package.json` 新增 vitest 等 devDependencies。
