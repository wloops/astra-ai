## ADDED Requirements

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

### Requirement: 根目录统一开发启动

系统 SHALL 提供根目录脚本以便开发者启动前端和后端。

#### Scenario: 启动前后端
- **WHEN** 开发者在根目录运行统一开发脚本
- **THEN** 系统 SHALL 同时启动后端 API 和前端 Vite 开发服务器
- **AND** SHALL 在 README 中说明默认访问地址
