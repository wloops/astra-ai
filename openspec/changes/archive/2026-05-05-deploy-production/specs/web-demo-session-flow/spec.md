## ADDED Requirements

### Requirement: 生产环境可访问

系统 SHALL 部署到生产服务器并通过域名对外提供服务。

#### Scenario: 前端域名可访问
- **WHEN** 浏览器访问 astra.wlait.com
- **THEN** SHALL 返回 Astra AI 前端页面

#### Scenario: API 域名可访问
- **WHEN** 客户端请求 astra-api.wlait.com/health
- **THEN** SHALL 返回 `{"status":"ok"}`
