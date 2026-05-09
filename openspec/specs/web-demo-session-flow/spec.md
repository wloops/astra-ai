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

#### Scenario: 展示相似案例
- **WHEN** 用户在议题输入框中输入超过 10 个字符
- **THEN** 前端 SHALL 防抖后调用 `/knowledge/similar?topic=<topic>&limit=3`
- **AND** SHALL 在表单下方展示相似案例卡片（标题、结论摘要、相似度百分比）

#### Scenario: 相似案例查询失败不影响
- **WHEN** 相似案例查询失败（如知识库为空或 API 异常）
- **THEN** SHALL 静默忽略，不阻断用户发起研讨

### Requirement: 会议进行页消费 SSE

前端会议进行页 SHALL 订阅后端 SSE 事件流并展示真实研讨过程，包括 Host Agent 决策、阶段跳过/新增、角色变更等新事件类型。阶段进度列表 SHALL 从事件流动态构建，不再硬编码固定阶段。

#### Scenario: 展示 Host Agent 决策
- **WHEN** 前端收到 `host_decision` 事件
- **THEN** 会议进行页 SHALL 渲染决策卡片
- **AND** 卡片 SHALL 展示决策原因（中文）和动作类型

#### Scenario: 展示阶段跳过
- **WHEN** 前端收到 `stage_skipped` 事件
- **THEN** 阶段进度列表 SHALL 标记该阶段为"已跳过"并展示跳过原因

#### Scenario: 展示新增阶段
- **WHEN** 前端收到 `stage_added` 事件
- **THEN** 阶段进度列表 SHALL 动态插入新阶段

#### Scenario: 展示角色变更
- **WHEN** 前端收到 `role_pulled` 或 `role_removed` 事件
- **THEN** 角色展示区域 SHALL 动态新增或移除角色卡片

#### Scenario: 展示 Agent 发言
- **WHEN** 前端收到 `agent_message` 事件
- **THEN** 会议进行页 SHALL 将事件转换为对应角色的发言项
- **AND** SHALL 展示角色、阶段、模型名称和消息摘要

#### Scenario: 展示争议识别
- **WHEN** 前端收到 `conflict_detected` 事件
- **THEN** 会议进行页 SHALL 展示关键争议点
- **AND** SHALL 标记支持方、审慎方和裁决结论

#### Scenario: Session 完成后进入结果页
- **WHEN** 前端收到 `session_completed` 事件
- **THEN** 会议进行页 SHALL 提供进入结果页的入口
- **AND** SHALL 携带当前 Session ID

#### Scenario: 展示知识检索状态
- **WHEN** Workspace 渲染右侧"活跃进程与工具"面板
- **THEN** SHALL 展示"知识库检索"条目
- **AND** 状态 SHALL 从假数据切换为实时事件驱动
- **AND** 收到 `knowledge_referenced` 事件时 SHALL 更新状态为"已找到 N 个案例"

#### Scenario: 知识检索未触发
- **WHEN** Host Agent 尚未发起 SEARCH_KNOWLEDGE
- **THEN** 展示"历史决策相似案例检索"条目状态 SHALL 为"等待中"

### Requirement: 会议结果页读取真实结果

前端会议结果页 SHALL 使用后端 `SessionResult` 渲染结构化交付物，并展示实际执行流程与场景建议流程的对比。

#### Scenario: 渲染完成结果（含流程对比）
- **WHEN** 结果页获得有效 Session ID 且结果含 `actual_flow` 字段
- **THEN** 前端 SHALL 请求 `GET /sessions/{session_id}/result`
- **AND** SHALL 渲染最终结论、关键争议、角色观点、风险、待确认问题、行动项和 Markdown 纪要
- **AND** SHALL 渲染实际执行流程（标注跳过的阶段和新增的阶段），与场景建议流程并排对比

#### Scenario: 渲染完成结果（兼容旧数据）
- **WHEN** 结果页获得有效 Session ID 但结果不含 `actual_flow`（旧版数据）
- **THEN** 前端 SHALL 正常渲染其他字段，流程对比区域显示"该研讨使用旧版流程，无流程对比数据"

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

### Requirement: 生产环境可访问

系统 SHALL 部署到生产服务器并通过 HTTPS 对外提供服务。

#### Scenario: API 域名可访问
- **WHEN** 客户端请求 https://astra-api.wlait.com/health
- **THEN** SHALL 返回 `{"status":"ok"}`

### Requirement: CI 自动验证

项目 SHALL 具备 GitHub Actions CI 流水线，在 push 和 PR 时自动验证。

#### Scenario: CI 自动运行
- **WHEN** 代码 push 到 main 或创建 PR
- **THEN** CI 流水线 SHALL 依次执行后端测试、前端构建和 OpenSpec 校验
- **AND** 任一环节失败时 SHALL 标记 CI 为 failed

### Requirement: Workspace 角色状态展示

前端 Workspace SHALL 在 Agent 发言流上方的角色卡片中展示角色当前状态，状态从 SSE 事件流推导，不新增轮询。

#### Scenario: 展示角色发言状态
- **WHEN** 前端收到 `agent_message_delta`
- **THEN** 对应角色卡片 SHALL 显示为"发言中"
- **AND** 发言列表 SHALL 将同一 `message_id` 的片段合并为一条正在输出的发言
- **AND** 单 Agent 发言 SHALL 以本地打字机节奏逐步展示，避免后端片段过快到达时瞬间显示全文

#### Scenario: 展示角色完成状态
- **WHEN** 前端收到 `agent_message_done` 或完整 `agent_message`
- **THEN** 对应角色卡片 SHALL 显示为"已发言"
- **AND** 同一 `message_id` 的流式发言和完整发言 SHALL NOT 重复展示

#### Scenario: 展示并行处理状态
- **WHEN** 前端收到 `parallel_start`
- **THEN** payload 中列出的角色卡片 SHALL 显示为"并行处理中"
- **AND** 并行阶段的完整 `agent_message` 到达后 SHALL 一次性展示对应角色发言

#### Scenario: 展示阶段感知等待提示
- **WHEN** Session 仍在运行且暂未收到下一条发言
- **THEN** 发言区域底部 SHALL 根据当前阶段展示等待提示
- **AND** 总结、行动项、纪要生成等阶段 SHALL 使用对应阶段语义，而不是固定显示等待下一位 Agent 发言

#### Scenario: 发言区域自动滚动
- **WHEN** 新发言、流式字符或等待提示出现且用户位于底部附近
- **THEN** 发言区域 SHALL 自动滚动到底部
- **WHEN** 用户手动向上滚动并离开底部
- **THEN** 发言区域 SHALL 暂停自动跟随并显示滚动到底部按钮
- **WHEN** 用户点击滚动到底部按钮
- **THEN** 发言区域 SHALL 滚动到底部并恢复自动跟随

#### Scenario: 展示角色失败或移除状态
- **WHEN** 前端收到包含错误的 `tool_event`
- **THEN** 对应角色卡片 SHALL 显示为"失败"
- **WHEN** 前端收到 `role_removed`
- **THEN** 对应角色 SHALL 不再作为活跃角色参与展示，或在仍保留的历史视图中显示为"已移除"

### Requirement: 会议中人工确认弹窗

The meeting workspace SHALL display an interactive human review prompt when the backend requests human confirmation during a running Session.

#### Scenario: 展示人工确认请求
- **WHEN** the frontend receives a `human_review_requested` event
- **THEN** the Workspace page SHALL display a modal or equivalent prominent prompt
- **AND** the prompt SHALL show the question, reason, blocking level, options when present, timeout information, and impact
- **AND** the meeting progress SHALL indicate that the Session is waiting for human review

#### Scenario: 提交人工确认回答
- **WHEN** the user submits an answer for a pending human review request
- **THEN** the frontend SHALL call the human review response endpoint for that request
- **AND** the prompt SHALL move into a submitted or waiting state until the backend emits `human_review_resolved`

#### Scenario: 人工确认请求超时
- **WHEN** the frontend receives a `human_review_timeout` event
- **THEN** the prompt SHALL close or switch to a timed-out state
- **AND** the meeting progress SHALL show that the Session continued using the backend timeout behavior

#### Scenario: 页面刷新后恢复待确认请求
- **WHEN** the Workspace page loads a Session whose status is `paused`
- **THEN** the frontend SHALL recover and display the pending human review request from session data or replayed SSE events

### Requirement: 人工确认事件展示

The meeting workspace SHALL render human review lifecycle events as part of the visible meeting timeline.

#### Scenario: 展示确认请求事件
- **WHEN** a `human_review_requested` event appears in the event stream
- **THEN** the timeline SHALL show that Host Agent requested human input
- **AND** the item SHALL include the request reason and blocking level

#### Scenario: 展示确认完成事件
- **WHEN** a `human_review_resolved` event appears in the event stream
- **THEN** the timeline SHALL show that the user response was accepted
- **AND** later Agent messages SHALL be shown after that confirmation point

#### Scenario: 展示确认超时事件
- **WHEN** a `human_review_timeout` event appears in the event stream
- **THEN** the timeline SHALL show the timeout result
- **AND** the item SHALL indicate whether the question was added to pending confirmation or a default answer was used

### Requirement: 结果页区分问题与行动项

The Session result page SHALL distinguish resolved decisions, unresolved questions, and executable action items.

#### Scenario: 渲染结构化待确认问题
- **WHEN** result `open_questions` contains structured unresolved items
- **THEN** the result page SHALL display each item with question, source, blocking level, impact, and status when available
- **AND** legacy string questions SHALL still render correctly

#### Scenario: 不把已解决问题显示为待确认
- **WHEN** a question was resolved by context, debate, judgement, or human review response
- **THEN** the result page SHALL NOT show it in the pending confirmation list
- **AND** the resolved decision SHALL be visible through final conclusion, risks, role summaries, or minutes

#### Scenario: 渲染可执行行动项
- **WHEN** result `actions` contains action items
- **THEN** the result page SHALL present them as executable follow-up tasks
- **AND** actions that depend on unresolved questions SHALL visibly indicate that dependency if the backend provides it

### Requirement: 人工确认交互失败处理

The frontend SHALL handle human review response failures without losing the current meeting state.

#### Scenario: 响应提交失败
- **WHEN** the human review response endpoint returns an error or the network request fails
- **THEN** the frontend SHALL show an actionable error message
- **AND** the pending prompt SHALL remain available for retry unless the backend has already timed out the request

#### Scenario: 请求已超时后提交
- **WHEN** the user submits an answer after the backend has already timed out the request
- **THEN** the frontend SHALL show that the request is no longer accepting responses
- **AND** the page SHALL continue consuming subsequent Session events

### Requirement: 根目录统一开发启动

系统 SHALL 提供根目录脚本以便开发者启动前端和后端。

#### Scenario: 启动前后端
- **WHEN** 开发者在根目录运行统一开发脚本
- **THEN** 系统 SHALL 同时启动后端 API 和前端 Vite 开发服务器
- **AND** SHALL 在 README 中说明默认访问地址
