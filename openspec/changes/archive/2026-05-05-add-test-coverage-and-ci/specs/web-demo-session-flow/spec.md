## ADDED Requirements

### Requirement: 自动化测试覆盖

项目 SHALL 具备后端 pytest 和前端 Vitest 自动化测试，覆盖关键功能路径。

#### Scenario: 后端测试通过
- **WHEN** 运行 `npm run test:api`
- **THEN** 全部 pytest 测试 SHALL 通过，覆盖 LLM Gateway 重试、SSE 事件流、Session CRUD 和 orchestrator workflow

#### Scenario: 前端测试通过
- **WHEN** 运行 `npm --prefix apps/web run test`
- **THEN** 全部 Vitest 测试 SHALL 通过，覆盖 ErrorBanner 组件和 apiClient

### Requirement: CI 自动验证

项目 SHALL 具备 GitHub Actions CI 流水线，在 push 和 PR 时自动验证。

#### Scenario: CI 自动运行
- **WHEN** 代码 push 到 main 或创建 PR
- **THEN** CI 流水线 SHALL 依次执行后端测试、前端构建和 OpenSpec 校验
- **AND** 任一环节失败时 SHALL 标记 CI 为 failed
