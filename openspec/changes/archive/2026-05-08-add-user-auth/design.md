## Context

当前鉴权层使用单一 `X-API-Key` header 方案（`add-api-key-auth-and-task-management` 中实现）。所有通过校验的请求被视为同一匿名调用者，无法区分操作者身份。本次升级为 JWT Bearer Token 方案，同时保留 API Key 作为 fallback 以保持工具链和 CI 的兼容性。

## Goals / Non-Goals

**Goals:**
- 用户可通过用户名+密码注册和登录
- 登录后获得 JWT access token，有效期 24 小时
- `get_current_user` 依赖优先从 `Authorization: Bearer <token>` 提取用户，fallback 到 `X-API-Key`
- 前端 AuthContext 管理登录状态，自动注入 token
- 前端路由守卫：未登录重定向到 `/login`
- `/auth/register`、`/auth/login`、`/health` 豁免鉴权

**Non-Goals:**
- 不做完整角色/权限系统；仅对 Agent Role / Scenario Template 这类全局配置写接口加 admin 限制
- 不做 token refresh、刷新令牌、会话管理
- 不做 OAuth/第三方登录
- 不做邮箱验证、密码重置
- 不做前端"记住我"功能
- 不做跨用户共享/协作（数据严格按 user_id 隔离）

## Decisions

### 1. JWT 库：python-jose

**选择**：`python-jose[cryptography]`，HS256 算法签名。

**备选**：PyJWT

**理由**：python-jose 提供 `jose.JWTError` 异常体系更清晰，FastAPI 生态中广泛使用，与 `passlib` 配合熟练。

### 2. 密码哈希：passlib + bcrypt

**选择**：`passlib[bcrypt]` 的 `CryptContext`，自动处理 salt 和轮数。

**理由**：Python 生态中密码哈希的事实标准，API 简洁。bcrypt 安全性足够当前阶段。

### 3. User 模型：极简设计

```
User
├── id: str (PK, "user_" + uuid)
├── username: str (unique, index)
├── hashed_password: str
├── created_at: datetime
└── last_login_at: datetime | None
```

不包含 email、display_name、avatar 等字段——需要时再加。

### 4. 数据隔离策略

**选择**：在 Project、DiscussionSession、Task 三张业务表新增 `user_id` 外键，所有查询按当前用户过滤。

**备选**：行级安全（RLS）、独立 SQLite 文件

**理由**：
- `user_id` 外键是最直接、最透明的方式，不依赖数据库特性
- SQLite 不支持 RLS，独立 SQLite 文件运维复杂
- 所有 GET/POST/PUT/DELETE 端点统一从 `get_current_user` 获取 user_id 过滤
- 创建资源时自动填入 `current_user.id`

**查询模式**：
```python
# 列表查询
def list_projects(session: Session, current_user: User, offset, limit):
    items = session.exec(
        select(Project).where(Project.user_id == current_user.id).order_by(...)
    ).all()
    total = session.exec(
        select(func.count()).select_from(Project).where(Project.user_id == current_user.id)
    ).one()
    ...

# 创建时注入
def create_project(payload: ProjectCreate, session: Session, current_user: User):
    project = Project(**payload.model_dump(), user_id=current_user.id)
    ...
```

### 5. 现有数据迁移

**选择**：启动时自动将 `user_id IS NULL` 的已有记录回填为默认 admin 用户的 ID。

**理由**：
- 当前生产数据库已有数据，不能丢失
- 回填到 admin 用户意味着这些历史数据对 API Key 调用者可见；如显式配置 `ASTRA_ADMIN_PASSWORD`，也可由 admin JWT 用户访问
- 新注册用户只能看到自己创建的新数据

### 6. 鉴权依赖演进策略

**现状**：
```python
api_router = APIRouter(dependencies=[Depends(verify_api_key)])
```

**目标**：
```python
async def get_current_user(
    authorization: str = Header(None),
    x_api_key: str = Header(None, alias="X-API-Key"),
) -> User:
    # 1. 优先 Bearer token
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        return decode_and_get_user(token)
    # 2. Fallback 到 API Key
    if x_api_key and x_api_key == settings.api_key:
        return get_default_user()  # API Key 用户映射为系统用户
    raise HTTPException(401)

api_router = APIRouter(dependencies=[Depends(get_current_user)])
```

**关键点**：API Key 仍然有效，但映射到一个预置的"系统用户"（seed 时创建）。这样现有依赖 API Key 的工具链不中断，同时新前端使用 JWT。

### 7. Token 前端存储：localStorage

**选择**：登录成功后将 token 存入 `localStorage`，`apiClient` 读取并注入 `Authorization` header。

**备选**：httpOnly cookie、sessionStorage

**理由**：
- 实现最简单，改动最小
- 不与后端 session 耦合
- XSS 风险在当前阶段可控（无 UGC 内容、无第三方脚本）
- 升级到 httpOnly cookie 时只需改 AuthContext 内部实现

### 8. 前端路由守卫

**选择**：AuthContext 提供 `isAuthenticated` + `user` 状态，App.tsx 中条件渲染。

```tsx
// 简化逻辑
{!isAuthenticated ? (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="*" element={<Navigate to="/login" />} />
  </Routes>
) : (
  <Routes>
    {/* 现有所有路由 */}
    <Route path="*" element={<Navigate to="/dashboard" />} />
  </Routes>
)}
```

不创建 `<ProtectedRoute>` 包装组件——当前阶段不需要更细粒度的权限控制。

### 9. 默认用户与兼容性

首次启动时 seed 创建默认用户 `admin`（仅当 User 表为空时），用于 API Key fallback 和历史数据归属。默认不启用 `admin/admin` 这类固定密码登录；只有显式配置 `ASTRA_ADMIN_PASSWORD` 时，系统才允许 `/auth/login` 为 admin 签发 JWT，并同步更新 admin 密码哈希。生产环境部署后应配置 `ASTRA_JWT_SECRET`，普通操作者通过 `/auth/register` 创建正式账号。

### 10. SSE 鉴权

EventSource API 不支持自定义 header。SSE 端点通过 query param `?token=<jwt>` 接收鉴权：

```typescript
const url = `${baseUrl}/sessions/${id}/events?token=${getToken()}`;
```

后端从 query param 提取 token 并验证（仅 SSE 端点使用此方式，其他端点继续用 header）。

## Risks / Trade-offs

- **[token 无刷新机制]**：24 小时后强制重新登录 → 用户体验可接受，后期可加 refresh token
- **[localStorage 存储 token]**：XSS 风险 → 当前无 UGC、无第三方脚本，风险可控
- **[API Key fallback 映射到单一系统用户]**：无法区分不同 API Key 持有者 → 当前 API Key 仅用于内部工具链，单一映射足够
- **[User 表极简]**：无 email 导致无法做密码重置 → 手动运维重置即可，不影响开发阶段使用
- **[历史数据全归 admin]**：所有已有数据回填为 admin 用户 → 这是有意设计，后续可通过 API Key fallback 或显式启用的 admin 账号迁移给其他用户（需另外做）

## Migration Plan

1. 安装 `passlib[bcrypt]` 和 `python-jose[cryptography]`
2. 新增 User 模型 → 数据库自动建表
3. Project / DiscussionSession / Task 表新增 `user_id` 字段（nullable 以便迁移）
4. seed 创建默认 admin 用户
5. 启动时将 `user_id IS NULL` 的已有记录回填为 admin 用户
6. 替换 `verify_api_key` → `get_current_user`（API Key 仍有效）
7. 所有查询端点加上 `WHERE user_id == current_user.id` 过滤
8. 前端 AuthContext 上线

回滚策略：将 `get_current_user` 替换回 `verify_api_key`，移除 user_id 过滤条件。历史数据的 user_id 不回退（nullable 不影响无鉴权时的查询）。

## Open Questions

无。所有设计决策已对齐。
