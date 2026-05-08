## 1. 依赖与配置

- [x] 1.1 安装后端依赖：`uv add passlib[bcrypt] python-jose[cryptography]`
- [x] 1.2 `config.py` 新增 `astra_jwt_secret: str = ""` 和 `astra_jwt_algorithm: str = "HS256"` 配置项

## 2. User 模型与 Schema（后端）

- [x] 2.1 `models.py` 新增 `User` SQLModel 表（id, username, hashed_password, created_at, last_login_at）
- [x] 2.2 `models.py` Project / DiscussionSession / Task 表新增 `user_id` 字段（nullable）
- [x] 2.3 `schemas.py` 新增 `UserCreate`（username + password）、`UserRead`、`TokenResponse`（access_token + token_type）

## 3. 认证模块（后端）

- [x] 3.1 新建 `auth.py`：`hash_password`、`verify_password`、`create_access_token`、`decode_token`、`get_current_user` Dependency
- [x] 3.2 `get_current_user` 实现 JWT 优先 + API Key fallback 逻辑；未配置时向后兼容放行；API Key 映射到 admin 用户
- [x] 3.3 `main.py` 新增 `/auth/register`、`/auth/login` 端点（豁免鉴权）
- [x] 3.4 `main.py` 替换 `verify_api_key` → `get_current_user`（所有路由统一注入）
- [x] 3.5 `main.py` SSE 端点支持 `?token=` query param（优先）+ `?api_key=` fallback
- [x] 3.6 `seed.py` 新增默认 admin 用户（仅当 User 表为空时），默认禁用 admin 密码登录，仅允许显式配置 `ASTRA_ADMIN_PASSWORD` 后启用
- [x] 3.7 `main.py` 限制 Agent Role / Scenario Template 写接口为 admin 用户

## 4. 数据隔离与迁移（后端）

- [x] 4.1 `main.py` 所有资源创建端点注入 `user_id=current_user.id`
- [x] 4.2 `main.py` 所有列表/详情/更新/删除端点按 `user_id` 过滤（跨用户访问返回 404）
- [x] 4.3 `db.py` 或 `main.py` lifespan 中新增启动迁移：将 `user_id IS NULL` 的已有记录回填为 admin 用户
- [x] 4.4 `seed.py` seed 数据归属 admin 用户

## 5. 前端 AuthContext

- [x] 4.1 新建 `src/contexts/AuthContext.tsx`：token 存储/恢复、login/logout/register 方法、isAuthenticated 状态
- [x] 4.2 `client.ts` 改为从 AuthContext/localeStorage 读取 token 设置 `Authorization: Bearer` header，fallback 到 `X-API-Key`
- [x] 4.3 `events.ts` SSE URL 支持 `?token=` query param

## 6. 前端登录/注册页面

- [x] 5.1 新建 `src/pages/Login.tsx`：用户名+密码表单，调用 /auth/login，存储 token，跳转 dashboard
- [x] 5.2 新建 `src/pages/Register.tsx`：用户名+密码+确认密码表单，调用 /auth/register，成功后跳转登录页

## 7. 前端路由守卫与导航

- [x] 6.1 `App.tsx` 包裹 AuthProvider，根据 isAuthenticated 条件渲染：未登录只暴露 /login、/register，其余重定向 /login
- [x] 6.2 `Navbar.tsx` 显示当前用户名 + 登出按钮

## 8. 测试

- [x] 7.1 `tests/test_auth.py`：注册成功/用户名重复、登录成功/密码错误/用户不存在、JWT 有效/过期/无效
- [x] 7.2 `tests/test_auth.py`：API Key fallback 仍然有效、未配置时放行、/health 和 /auth/* 豁免
- [x] 8.3 更新现有测试 fixture：改用 JWT token 而非 API Key（或同时支持）
- [x] 8.4 数据隔离测试：用户 A 无法访问用户 B 的数据、跨用户操作返回 404
- [x] 8.5 数据迁移测试：user_id IS NULL 记录启动时自动回填
- [x] 8.6 安全回归测试：默认 admin/admin 登录被拒绝但 API Key fallback 仍可用
- [x] 8.7 权限回归测试：普通用户不能写全局角色和场景模板，配置 admin 密码后 admin 可写
