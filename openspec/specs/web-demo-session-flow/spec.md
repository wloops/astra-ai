# web-demo-session-flow Specification

## Purpose
定义前端 demo 迁入 monorepo 后，接入后端 REST/SSE 并完成智能研讨演示闭环的行为。

## Requirements
### Requirement: 前端 demo 迁入 monorepo

系统 SHALL 将现有 Astra 前端 demo 迁入 `apps/web`，使其成为 monorepo 内可独立运行的 Vite 前端应用。

#### Scenario: 前端项目可运行
- **WHEN** 开发者在根目录运行前端开发脚本
- **THEN** 系统 SHALL 启动 `apps/web` 内的 Vite 开发服务器
- **AND** SHALL 保留现有主要页面路由和视觉布局

### Requirement: 前端 API client

前端 SHALL 通过统一 API client 访问后端 REST 接口。

#### Scenario: 配置后端地址
- **WHEN** 前端启动时存在 `VITE_API_BASE_URL`
- **THEN** API client SHALL 使用该地址作为后端 base URL
- **AND** 未配置时 SHALL 默认连接 `http://127.0.0.1:8010`

#### Scenario: 读取后端基础数据
- **WHEN** 发起研讨页加载
- **THEN** 前端 SHALL 请求项目、Agent 角色和场景模板接口
- **AND** SHALL 使用后端返回的数据填充选择控件

### Requirement: 发起真实研讨 Session

前端 SHALL 允许用户基于后端项目、场景、角色和议题创建真实研讨 Session。

#### Scenario: 创建 Session 并进入会议进行页
- **WHEN** 用户在发起研讨页提交有效项目、场景、角色和议题
- **THEN** 前端 SHALL 调用 `POST /sessions`
- **AND** SHALL 使用返回的 Session ID 跳转会议进行页

#### Scenario: 创建 Session 失败
- **WHEN** 后端返回错误或网络失败
- **THEN** 前端 SHALL 显示可理解的错误状态
- **AND** SHALL 不跳转到会议进行页

### Requirement: 会议进行页消费 SSE

前端会议进行页 SHALL 订阅后端 SSE 事件流并展示真实研讨过程。

#### Scenario: 展示阶段事件
- **WHEN** 前端收到 `stage_started` 或 `stage_completed` 事件
- **THEN** 会议进行页 SHALL 更新当前阶段和进度展示

#### Scenario: 展示 Agent 发言
- **WHEN** 前端收到 `agent_message` 事件
- **THEN** 会议进行页 SHALL 将事件转换为对应角色的发言项
- **AND** SHALL 展示角色、阶段和消息摘要

#### Scenario: 展示争议识别
- **WHEN** 前端收到 `conflict_detected` 事件
- **THEN** 会议进行页 SHALL 展示关键争议点
- **AND** SHALL 标记支持方、审慎方和裁决结论

#### Scenario: Session 完成后进入结果页
- **WHEN** 前端收到 `session_completed` 事件
- **THEN** 会议进行页 SHALL 提供进入结果页的入口
- **AND** SHALL 携带当前 Session ID

### Requirement: 会议结果页读取真实结果

前端会议结果页 SHALL 使用后端 `SessionResult` 渲染结构化交付物。

#### Scenario: 渲染完成结果
- **WHEN** 结果页获得有效 Session ID
- **THEN** 前端 SHALL 请求 `GET /sessions/{session_id}/result`
- **AND** SHALL 渲染最终结论、关键争议、角色观点、风险、待确认问题、行动项和 Markdown 纪要

#### Scenario: 结果尚未生成
- **WHEN** 结果接口返回未找到或 Session 未完成
- **THEN** 前端 SHALL 展示等待或返回会议进行页的状态

### Requirement: Dashboard 展示真实数据

前端 Dashboard SHALL 从后端 API 获取数据并展示真实统计信息，不再使用硬编码 mock 数据。

#### Scenario: 展示统计数据
- **WHEN** Dashboard 页面加载
- **THEN** 前端 SHALL 调用 `GET /sessions` 和 `GET /projects` 获取数据
- **AND** SHALL 从 session 列表中聚合统计（总数、完成数、进行中数等）
- **AND** SHALL 在 StatsCards 中展示聚合后的真实数值

#### Scenario: 展示最近项目
- **WHEN** Dashboard 页面加载
- **THEN** 前端 SHALL 调用 `GET /projects` 并按 `updated_at` 排序取最近若干条
- **AND** SHALL 在 RecentProjects 区域展示项目名称、标签和更新时间

#### Scenario: 展示最近会议
- **WHEN** Dashboard 页面加载
- **THEN** 前端 SHALL 调用 `GET /sessions` 并按 `created_at` 排序取最近若干条
- **AND** SHALL 在 RecentMeetings 区域展示 session 议题、关联项目名和状态

### Requirement: Session 历史列表接入

前端 SessionHistory 页面 SHALL 调用后端 API 获取真实研讨记录列表和详情。

#### Scenario: 展示 Session 列表
- **WHEN** SessionHistory 页面加载
- **THEN** 前端 SHALL 调用 `GET /sessions` 获取 session 列表
- **AND** SHALL 将后端字段映射为 UI 展示字段（topic → title、status 枚举值映射为中文状态、created_at 格式化为本地时间）

#### Scenario: 展示 Session 详情
- **WHEN** 用户点击某个 session 条目
- **THEN** 前端 SHALL 调用 `GET /sessions/{id}/result` 获取结构化结果
- **AND** SHALL 在详情面板渲染最终结论、关键争议和参与角色信息

#### Scenario: Session 列表为空
- **WHEN** 后端返回空 session 列表
- **THEN** 前端 SHALL 展示友好的空状态提示

### Requirement: 项目管理页面接入

前端 ProjectContext 页面 SHALL 调用后端 API 展示真实项目列表并支持创建新项目。

#### Scenario: 展示项目列表
- **WHEN** ProjectContext 页面加载
- **THEN** 前端 SHALL 调用 `GET /projects` 获取项目列表
- **AND** SHALL 将后端字段映射为 UI 展示字段（name → title、completeness → 完整度百分比、updated_at → 格式化时间）

#### Scenario: 项目统计概览
- **WHEN** ProjectContext 页面加载
- **THEN** 前端 SHALL 从项目列表中聚合统计（总数、完整度 ≥80% 的项目数等）
- **AND** SHALL 在 ProjectsOverview 中展示聚合后的数值

#### Scenario: 创建新项目
- **WHEN** 用户在新建项目表单中提交项目名称、目标、背景等信息
- **THEN** 前端 SHALL 调用 `POST /projects` 创建项目
- **AND** SHALL 创建成功后刷新项目列表

#### Scenario: 创建项目失败
- **WHEN** 后端返回错误或网络失败
- **THEN** 前端 SHALL 显示可理解的错误提示
- **AND** SHALL 保留已填写的表单数据

### Requirement: 角色与场景配置页面接入

前端 RoleConfig 页面 SHALL 调用后端 API 展示真实角色和场景模板数据并支持新建角色。

#### Scenario: 展示角色列表
- **WHEN** RoleConfig 页面加载
- **THEN** 前端 SHALL 调用 `GET /agent-roles` 获取角色列表
- **AND** SHALL 将后端字段映射为 UI 展示字段（name/code/description/responsibilities/focus_areas/tools/output_style/can_debate/can_use_tools/is_default）

#### Scenario: 展示场景模板列表
- **WHEN** RoleConfig 页面加载
- **THEN** 前端 SHALL 调用 `GET /scenario-templates` 获取场景模板列表
- **AND** SHALL 将后端字段映射为 UI 展示字段，并通过 `default_role_codes` 关联角色展示

#### Scenario: 创建新角色
- **WHEN** 用户在新建角色表单中提交角色名称、代号、职责等信息
- **THEN** 前端 SHALL 调用 `POST /agent-roles` 创建角色
- **AND** SHALL 创建成功后刷新角色列表

#### Scenario: 创建角色失败
- **WHEN** 后端返回错误或网络失败
- **THEN** 前端 SHALL 显示可理解的错误提示
- **AND** SHALL 保留已填写的表单数据

### Requirement: Dashboard 图表展示真实趋势

前端 Dashboard 的 EfficiencyOverview SHALL 从后端 API 聚合真实数据展示研讨趋势。

#### Scenario: 展示近 7 天研讨趋势
- **WHEN** Dashboard 页面加载
- **THEN** EfficiencyOverview 图表 SHALL 从 `GET /sessions` 按日聚合近 7 天 session 创建数量
- **AND** SHALL 展示上下文完整度均值（从 `GET /projects` completeness 平均值计算）

#### Scenario: 无数据时展示占位
- **WHEN** 近 7 天无 session 记录
- **THEN** EfficiencyOverview SHALL 展示"暂无数据"占位状态

### Requirement: SessionHistory 搜索与过滤

前端 SessionHistory SHALL 支持前端搜索和按项目/场景筛选。

#### Scenario: 搜索会议标题
- **WHEN** 用户在搜索框输入关键词
- **THEN** 列表 SHALL 过滤仅显示 topic 包含关键词的 session

#### Scenario: 按项目筛选
- **WHEN** 用户选择特定项目
- **THEN** 列表 SHALL 过滤仅显示该项目的 session
- **AND** 项目下拉框 SHALL 从 `GET /projects` 动态填充选项

#### Scenario: 按场景筛选
- **WHEN** 用户选择特定场景
- **THEN** 列表 SHALL 过滤仅显示该场景的 session
- **AND** 场景下拉框 SHALL 从 `GET /scenario-templates` 动态填充选项

#### Scenario: 展示场景名称
- **WHEN** SessionHistory 列表渲染
- **THEN** SHALL 通过 scenario_id 关联显示对应场景模板名称

### Requirement: QuickStart 导航补完

前端 Dashboard 的 QuickStart SHALL 为所有操作卡片提供可用的路由跳转。

#### Scenario: 查看会议历史
- **WHEN** 用户点击"查看历史"卡片
- **THEN** SHALL 跳转到 `/session-history` 页面

#### Scenario: 管理项目上下文
- **WHEN** 用户点击"管理项目"卡片
- **THEN** SHALL 跳转到 `/project-context` 页面

### Requirement: SSE 断连自动重连

前端 SSE 订阅 SHALL 在连接断开时自动重连，并在重连成功后恢复状态。

#### Scenario: SSE 断连后指数退避重连
- **WHEN** SSE EventSource 触发 onerror 且 Session 非终态
- **THEN** 前端 SHALL 在 1s/2s/4s/8s/16s 间隔后自动重新创建连接
- **AND** SHALL 最多重试 5 次
- **AND** 重试期间 SHALL 展示"重新连接中…"提示

#### Scenario: 重连成功清除错误
- **WHEN** SSE 重连成功（EventSource onopen）
- **THEN** 前端 SHALL 清除"连接不可用"或"重新连接中"的提示

#### Scenario: 重连耗尽后停止
- **WHEN** SSE 重连达到最大次数（5 次）仍失败
- **THEN** 前端 SHALL 展示"连接失败，请刷新页面"提示

### Requirement: SSE 心跳检测

前端 SHALL 检测 SSE 连接是否处于静默无事件状态。

#### Scenario: 长时间无事件时提示
- **WHEN** SSE 连接建立后超过 30 秒未收到任何事件
- **THEN** 前端 SHALL 展示"连接可能已中断，等待事件…"提示

#### Scenario: 收到事件时清除心跳提示
- **WHEN** SSE 收到新事件
- **THEN** 前端 SHALL 清除心跳超时提示并重置计时器

### Requirement: 列表页 API 失败错误展示

前端列表页 SHALL 在 API 调用失败时展示可感知的错误提示。

#### Scenario: Dashboard 加载失败
- **WHEN** Dashboard 的 `listProjects` 或 `listSessions` 调用失败
- **THEN** 前端 SHALL 展示错误横幅 + 重试按钮

#### Scenario: SessionHistory 加载失败
- **WHEN** SessionHistory 的 `listSessions` 调用失败
- **THEN** 前端 SHALL 展示错误横幅

#### Scenario: ProjectContext 加载失败
- **WHEN** ProjectContext 的 `listProjects` 调用失败
- **THEN** 前端 SHALL 展示错误横幅

#### Scenario: RoleConfig 加载失败
- **WHEN** RoleConfig 的 `listAgentRoles` 或 `listScenarioTemplates` 调用失败
- **THEN** 前端 SHALL 展示错误横幅

### Requirement: 自动化测试覆盖

项目 SHALL 具备后端 pytest 和前端 Vitest 自动化测试，覆盖关键功能路径。

#### Scenario: 后端测试通过
- **WHEN** 运行 `npm run test:api`
- **THEN** 全部 pytest 测试 SHALL 通过，覆盖 LLM Gateway 重试、SSE 事件流、Session CRUD 和 orchestrator workflow

#### Scenario: 前端测试通过
- **WHEN** 运行 `npm --prefix apps/web run test`
- **THEN** 全部 Vitest 测试 SHALL 通过，覆盖 ErrorBanner 组件和 apiClient

### Requirement: 角色编辑与更新

前端 RoleConfig SHALL 支持编辑已有角色并提交更新。

#### Scenario: 编辑角色
- **WHEN** 用户在角色详情中点击"编辑基础信息"
- **THEN** 前端 SHALL 展示预填当前值的编辑表单
- **AND** 提交时 SHALL 调用 `PUT /agent-roles/{id}` 更新角色

### Requirement: 项目编辑与更新

前端 ProjectContext SHALL 支持编辑已有项目并提交更新。

#### Scenario: 编辑项目
- **WHEN** 用户在项目卡片上点击编辑
- **THEN** 前端 SHALL 展示预填当前值的编辑表单
- **AND** 提交时 SHALL 调用 `PUT /projects/{id}` 更新项目

### Requirement: CI 自动验证

项目 SHALL 具备 GitHub Actions CI 流水线，在 push 和 PR 时自动验证。

#### Scenario: CI 自动运行
- **WHEN** 代码 push 到 main 或创建 PR
- **THEN** CI 流水线 SHALL 依次执行后端测试、前端构建和 OpenSpec 校验
- **AND** 任一环节失败时 SHALL 标记 CI 为 failed

### Requirement: 根目录统一开发启动

系统 SHALL 提供根目录脚本以便开发者启动前端和后端。

#### Scenario: 启动前后端
- **WHEN** 开发者在根目录运行统一开发脚本
- **THEN** 系统 SHALL 同时启动后端 API 和前端 Vite 开发服务器
- **AND** SHALL 在 README 中说明默认访问地址
