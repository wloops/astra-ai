## 1. 依赖与配置

- [x] 1.1 在 `pyproject.toml` 添加 `slowapi` 依赖
- [x] 1.2 在 `config.py` 新增 `cors_origins: str = ""` 和 `rate_limit_enabled: bool = True` 配置项
- [x] 1.3 在 `.env` 添加 `ASTRA_CORS_ORIGINS` 配置示例

## 2. 安全响应头中间件

- [x] 2.1 在 `main.py` 新增 `SecurityHeadersMiddleware` (纯 ASGI 中间件)，添加 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`
- [x] 2.2 HSTS 头仅在 HTTPS 请求时返回（检查 `request.url.scheme` 或 `X-Forwarded-Proto` header）
- [x] 2.3 将安全头中间件挂载到 FastAPI app

## 3. CORS 白名单

- [x] 3.1 修改 `main.py` 中 `CORSMiddleware` 配置，从 `settings.cors_origins` 读取白名单
- [x] 3.2 白名单为空时 fallback 到 `["*"]` 保持兼容

## 4. 速率限制

- [x] 4.1 创建 `slowapi` Limiter 实例，使用内存存储后端
- [x] 4.2 在 `main.py` 挂载 `SlowAPIMiddleware`（仅 `settings.rate_limit_enabled` 为 True 时）
- [x] 4.3 对 POST /sessions 添加 `@limiter.limit("10/minute")` 装饰器
- [x] 4.4 全局应用 `@limiter.limit("60/minute")` 或通过中间件默认值
- [x] 4.5 GET /health 端点排除在限流之外

## 5. 测试

- [x] 5.1 新增 `test_security.py`：CORS 白名单生效 + 未配置 fallback
- [x] 5.2 新增安全头存在性测试（HTTP 请求无 HSTS，HTTPS 有 HSTS）
- [x] 5.3 新增速率限制测试（超限返回 429，关闭后不受限）

## 6. 清理

- [x] 6.1 删除根目录残留文件：`Astra-AI-web-main.zip`、`api-dev.*.log`、`web-dev.*.log`
- [x] 6.2 .gitignore 补充 `*.err.log`、`*.out.log` 规则
- [x] 6.3 确认 `.env` 文件中的真实 API Key 不被提交
