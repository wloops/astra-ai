# user-auth Specification

## Purpose

用户注册与登录功能，通过 JWT Bearer Token 实现身份识别，前端提供完整的认证状态管理。

## ADDED Requirements

### Requirement: 用户注册

系统 SHALL 提供用户注册端点，接受用户名和密码创建新用户。

#### Scenario: 成功注册
- **WHEN** 客户端 POST `/auth/register` 提交 `{"username": "alice", "password": "secure123"}`
- **THEN** 系统 SHALL 创建用户记录并返回 `{"id": "user_...", "username": "alice", "created_at": "..."}`
- **AND** 密码 SHALL 以 bcrypt 哈希存储，不返回原始密码

#### Scenario: 用户名重复
- **WHEN** 客户端提交已存在的用户名
- **THEN** 系统 SHALL 返回 HTTP 409 Conflict
- **AND** 响应体 SHALL 包含 `{"detail": "Username already exists"}`

#### Scenario: 参数校验失败
- **WHEN** 客户端提交的用户名或密码为空或格式不合法
- **THEN** 系统 SHALL 返回 HTTP 422 Unprocessable Entity

### Requirement: 用户登录

系统 SHALL 提供登录端点，验证用户名密码并返回 JWT access token。

#### Scenario: 成功登录
- **WHEN** 客户端 POST `/auth/login` 提交正确的用户名和密码
- **THEN** 系统 SHALL 返回 `{"access_token": "<jwt>", "token_type": "bearer"}`
- **AND** JWT payload SHALL 包含 `{"sub": "<user_id>", "username": "<username>"}`
- **AND** token 有效期 SHALL 为 24 小时
- **AND** 系统 SHALL 更新用户的 `last_login_at`

#### Scenario: 密码错误
- **WHEN** 客户端提交正确的用户名但错误的密码
- **THEN** 系统 SHALL 返回 HTTP 401 Unauthorized
- **AND** 响应体 SHALL 包含 `{"detail": "Invalid username or password"}`

#### Scenario: 用户不存在
- **WHEN** 客户端提交不存在的用户名
- **THEN** 系统 SHALL 返回 HTTP 401 Unauthorized
- **AND** 响应体 SHALL 包含 `{"detail": "Invalid username or password"}`

### Requirement: 鉴权端点豁免

系统 SHALL 对 `/auth/register` 和 `/auth/login` 端点豁免鉴权校验，允许未认证用户访问。

#### Scenario: 注册端点免鉴权
- **WHEN** 未认证客户端请求 POST `/auth/register`
- **THEN** 系统 SHALL 正常处理注册请求，不返回 401

#### Scenario: 登录端点免鉴权
- **WHEN** 未认证客户端请求 POST `/auth/login`
- **THEN** 系统 SHALL 正常处理登录请求，不返回 401

### Requirement: JWT Token 身份提取

系统 SHALL 在所有受保护端点从 `Authorization: Bearer <token>` 请求头提取用户身份。

#### Scenario: 有效 JWT Token
- **WHEN** 客户端请求携带 `Authorization: Bearer <valid_jwt>`
- **THEN** 系统 SHALL 解析 token 获取 user_id
- **AND** SHALL 查询数据库确认用户存在
- **AND** SHALL 将 User 对象注入到路由处理函数的 `current_user` 参数

#### Scenario: JWT Token 过期
- **WHEN** 客户端请求携带已过期的 JWT token
- **THEN** 系统 SHALL 返回 HTTP 401 Unauthorized
- **AND** 响应体 SHALL 包含 `{"detail": "Token expired"}`

#### Scenario: JWT Token 无效
- **WHEN** 客户端请求携带被篡改或格式错误的 JWT token
- **THEN** 系统 SHALL 返回 HTTP 401 Unauthorized
- **AND** 响应体 SHALL 包含 `{"detail": "Invalid token"}`

### Requirement: 默认管理员用户

系统 SHALL 在首次启动且 User 表为空时，自动创建默认用户 `admin`，用于 API Key fallback 和历史数据归属。默认情况下系统 SHALL 禁用 admin 密码登录；只有显式配置 `ASTRA_ADMIN_PASSWORD` 后，admin 才可通过 `/auth/login` 获取 JWT。

#### Scenario: 首次启动创建默认用户
- **WHEN** 后端启动且 User 表为空
- **THEN** 系统 SHALL 创建用户名 `admin` 的用户
- **AND** 若未配置 `ASTRA_ADMIN_PASSWORD`，该用户 SHALL 不能使用固定默认密码登录

#### Scenario: 默认 admin 密码登录被拒绝
- **WHEN** 未配置 `ASTRA_ADMIN_PASSWORD` 且客户端 POST `/auth/login` 提交 `{"username": "admin", "password": "admin"}`
- **THEN** 系统 SHALL 返回 HTTP 401 Unauthorized

#### Scenario: 显式配置 admin 密码后允许登录
- **WHEN** 已配置 `ASTRA_ADMIN_PASSWORD` 且客户端提交匹配的 admin 密码
- **THEN** 系统 SHALL 返回 admin 用户的 JWT access token

#### Scenario: 已有用户时跳过
- **WHEN** 后端启动且 User 表已有记录
- **THEN** 系统 SHALL 不创建默认用户

### Requirement: 业务数据按用户隔离

系统 SHALL 在 Project、DiscussionSession、Task 表中维护 `user_id` 外键，确保每个用户只能操作自己的数据。

#### Scenario: 创建资源时自动关联用户
- **WHEN** 已认证用户创建 Project、Session 或 Task
- **THEN** 系统 SHALL 自动将 `current_user.id` 填入 `user_id` 字段

#### Scenario: 列表查询仅返回当前用户数据
- **WHEN** 已认证用户请求 GET /projects、GET /sessions 或 GET /tasks
- **THEN** 系统 SHALL 仅返回 `user_id == current_user.id` 的记录

#### Scenario: 跨用户访问资源返回 404
- **WHEN** 已认证用户通过 ID 请求其他用户的 Project、Session 或 Task
- **THEN** 系统 SHALL 返回 HTTP 404（而非 403，避免信息泄露）

#### Scenario: 跨用户更新资源返回 404
- **WHEN** 已认证用户尝试 PUT/DELETE 其他用户的资源
- **THEN** 系统 SHALL 返回 HTTP 404

### Requirement: 历史数据迁移

系统 SHALL 在启动时将 `user_id IS NULL` 的已有业务记录自动回填为默认 admin 用户。

#### Scenario: 首次升级时回填
- **WHEN** 后端启动且存在 user_id 为 NULL 的 Project/DiscussionSession/Task
- **THEN** 系统 SHALL 将这些记录的 user_id 更新为 admin 用户 ID

#### Scenario: 后续启动跳过
- **WHEN** 后端启动且所有业务记录的 user_id 均非 NULL
- **THEN** 系统 SHALL 不执行任何回填操作

### Requirement: API Key 用户映射

系统 SHALL 将通过 API Key 鉴权的请求映射到默认 admin 用户，使其可访问 admin 的数据。

#### Scenario: API Key 请求以 admin 身份操作
- **WHEN** 客户端通过 `X-API-Key` 鉴权（未携带 JWT）
- **THEN** 系统 SHALL 以 admin 用户身份处理请求
- **AND** 查询 SHALL 返回 admin 用户的数据
- **AND** 创建的资源 SHALL 归属 admin 用户

### Requirement: 全局配置写权限

系统 SHALL 限制 Agent Role 与 Scenario Template 的创建、更新、删除操作仅允许 admin 用户执行。

#### Scenario: 普通用户不能写全局配置
- **WHEN** 普通注册用户请求 POST/PUT/DELETE `/agent-roles` 或 `/scenario-templates`
- **THEN** 系统 SHALL 返回 HTTP 403 Forbidden

#### Scenario: admin 用户可以写全局配置
- **WHEN** API Key fallback 用户或已显式配置密码登录的 admin JWT 用户请求写全局配置
- **THEN** 系统 SHALL 正常处理请求

### Requirement: 前端认证状态管理

前端 SHALL 通过 AuthContext 管理认证状态，提供 `user`、`isAuthenticated`、`login`、`logout`、`register` 方法。

#### Scenario: 登录成功
- **WHEN** 用户在前端登录页面提交正确凭证
- **THEN** AuthContext SHALL 将 JWT token 存入 localStorage
- **AND** SHALL 更新 `isAuthenticated` 为 true
- **AND** SHALL 自动跳转到 Dashboard

#### Scenario: Token 持久化恢复
- **WHEN** 用户刷新页面且 localStorage 中存在有效 token
- **THEN** AuthContext SHALL 从 token payload 恢复用户信息
- **AND** SHALL 设置 `isAuthenticated` 为 true（无需重新调用后端）

#### Scenario: 登出
- **WHEN** 用户点击登出按钮
- **THEN** AuthContext SHALL 清除 localStorage 中的 token
- **AND** SHALL 设置 `isAuthenticated` 为 false
- **AND** SHALL 跳转到登录页

### Requirement: 前端路由守卫

前端 SHALL 对未认证用户限制访问受保护页面，自动重定向到登录页。

#### Scenario: 未登录访问受保护页面
- **WHEN** 未认证用户访问 `/dashboard`、`/workspace`、`/task-board` 等受保护路由
- **THEN** 前端 SHALL 重定向到 `/login`

#### Scenario: 已登录访问登录页
- **WHEN** 已认证用户访问 `/login` 或 `/register`
- **THEN** 前端 SHALL 重定向到 `/dashboard`

#### Scenario: 公开页面无限制
- **WHEN** 任何用户访问 `/login` 或 `/register`
- **THEN** 前端 SHALL 正常渲染页面，不执行鉴权检查

### Requirement: 前端请求自动注入 Token

前端 apiClient SHALL 在每个请求中自动附带 JWT Bearer token。

#### Scenario: 已登录时附带 Authorization header
- **WHEN** AuthContext 中存在有效 token
- **THEN** apiClient SHALL 在每个请求中设置 `Authorization: Bearer <token>` header
- **AND** SHALL 不再发送 `X-API-Key` header

#### Scenario: 未登录时不附带 header
- **WHEN** AuthContext 中无 token
- **THEN** apiClient SHALL 不设置 `Authorization` header
- **AND** 若有 `VITE_API_KEY` 配置则 fallback 发送 `X-API-Key`

### Requirement: 前端 SSE Token 传递

前端 SSE 订阅 SHALL 通过 URL query param `?token=<jwt>` 传递鉴权信息。

#### Scenario: SSE 订阅附带 JWT token
- **WHEN** 已登录用户打开工作台页面
- **THEN** SSE EventSource URL SHALL 包含 `?token=<jwt>` query param
- **AND** 后端 SHALL 优先从 query param 提取 token 进行鉴权
