## Why

当前鉴权依赖单一 `X-API-Key` header 方案，无法区分操作者身份。产品需要基本的用户注册登录能力来识别谁在使用系统，同时按用户隔离数据——每个用户只能看到自己创建的项目/任务/研讨记录，为多用户使用场景打基础。

## What Changes

- **新增 User 模型**：用户名 + 密码哈希存储（bcrypt），含注册时间和最后登录时间
- **新增 /auth/register 和 /auth/login 端点**：注册返回用户信息，登录返回 JWT access token
- **替换鉴权依赖**：`verify_api_key`（仅检查 API Key）→ `get_current_user`（优先 JWT Bearer，fallback 到 API Key），保持向后兼容
- **数据隔离**：Project / DiscussionSession / Task 表新增 `user_id` 外键，所有查询按当前用户过滤；现有数据迁移至默认 admin 用户
- **API Key 用户映射**：通过 API Key 鉴权的请求映射到默认系统用户，其数据对所有 API Key 调用者可见
- **默认 admin 安全策略**：默认 admin 用户仅用于 API Key fallback 和历史数据归属；只有显式配置 `ASTRA_ADMIN_PASSWORD` 后才允许通过 `/auth/login` 签发 admin JWT
- **全局配置写权限**：Agent Role 和 Scenario Template 的写接口仅允许 admin 用户访问，避免普通注册用户修改全局模板
- **前端新增 AuthContext**：管理 token 存储、自动附带 Authorization header、登录状态感知
- **前端新增 Login 和 Register 页面**：基础表单页面，含表单校验和错误提示
- **前端路由守卫**：未登录时重定向到登录页（/health 等公开页面除外）
- **SSE 鉴权升级**：支持 Bearer token 通过 query param 传递

## Capabilities

### New Capabilities

- `user-auth`: 用户注册登录、JWT 签发验证、前端认证状态管理

### Modified Capabilities

- `api-key-auth`: 鉴权依赖从仅 API Key 扩展为 JWT 优先 + API Key fallback，增加 `/auth/register` 和 `/auth/login` 豁免鉴权

## Impact

- **后端新增文件**: `auth.py`（JWT 签发/验证、密码哈希、get_current_user 依赖）
- **后端修改文件**: `models.py`（User 模型 + Project/DiscussionSession/Task 加 user_id）、`schemas.py`（UserCreate/UserRead/TokenResponse）、`main.py`（auth 路由 + 替换鉴权依赖 + 所有查询加 user_id 过滤 + 全局配置写权限限制）、`config.py`（JWT secret 与 admin password 配置）、`seed.py`（seed 数据归属 admin）
- **前端新增文件**: `AuthContext.tsx`、`Login.tsx`、`Register.tsx`
- **前端修改文件**: `App.tsx`（路由守卫 + 新路由）、`client.ts`（Bearer token 替代 API Key header）、`events.ts`（SSE token param）、`Navbar.tsx`（登录状态 + 登出按钮）
- **新增依赖**: `passlib[bcrypt]`、`python-jose[cryptography]`（后端）；无新前端依赖
- **测试**: `test_auth.py`（注册/登录/鉴权流程）
- **数据迁移**: 已有 Project/DiscussionSession/Task 记录的 user_id 回填为默认 admin 用户
- **部署**: 生产环境需配置 `ASTRA_JWT_SECRET`；如需允许 admin 密码登录，额外配置 `ASTRA_ADMIN_PASSWORD`；前端无新配置项
