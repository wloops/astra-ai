## 1. 后端测试扩展

- [x] 1.1 补充 LLM Gateway 重试行为测试：网络超时→重试→fallback、5xx→重试→fallback、4xx→抛异常不重试。
- [x] 1.2 补充 LLM Gateway 本地 fallback 测试：各阶段（clarify/independent_review/detect_conflict/debate/judge/generate_actions）产出正确结构。
- [x] 1.3 补充 SSE 事件流测试：连接→接收事件→session completed→流关闭；session 不存在时错误事件。
- [x] 1.4 补充 Session CRUD 测试：创建 session→查询列表→查询单条→结果获取。
- [x] 1.5 补充 orchestrator 完整 workflow 测试：本地 fallback 下产出正确的事件数和 SessionResult。

## 2. 前端测试引入

- [x] 2.1 安装 vitest、@testing-library/react、@testing-library/jest-dom、jsdom。
- [x] 2.2 配置 `vitest.config.ts` 和 `setupTests.ts`。
- [x] 2.3 为 `ErrorBanner` 组件添加渲染测试（展示 message、点击重试、点击关闭）。
- [x] 2.4 为 `apiClient` 添加 mock fetch 测试（listProjects、createSession 成功/失败路径）。
- [x] 2.5 `package.json` 添加 `test` 和 `test:ci` 脚本。

## 3. CI 流水线

- [x] 3.1 创建 `.github/workflows/ci.yml`：checkout → setup python + node → install → pytest → build → validate。
- [x] 3.2 确认 workflow 包含 uv 和 npm 依赖安装。

## 4. 验证

- [x] 4.1 运行 `npm run test:api` 确认全部后端测试通过。
- [x] 4.2 运行 `npm --prefix apps/web run test` 确认前端测试通过。
- [x] 4.3 运行 `npm --prefix apps/web run build` 确认编译通过。
- [x] 4.4 运行 `openspec validate add-test-coverage-and-ci --strict`。
