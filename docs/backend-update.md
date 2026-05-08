# 后端更新操作说明

本文记录 Astra API 在云服务器上的常规更新流程。不要把真实服务器 IP、账号、密钥或内网地址写入仓库；实际值应放在私有运维文档或密码管理器中。

## 前提

- 服务器已安装 `git`、`docker` 和 `docker compose`。
- 服务器上已有本仓库工作目录，并使用根目录的 `Dockerfile` 与 `docker-compose.yml` 运行后端。
- 后端通过反向代理或网关暴露为 `https://astra-api.wlait.com`。
- SQLite 数据目录通过 `./data:/app/data` 挂载，更新容器不会删除数据库文件。

## 连接服务器

```bash
ssh <user>@<server-host>
```

示例：

```bash
ssh root@<server-ip>
```

注意：SSH 目标不要带 `http://` 或 `https://`。`ssh root@http://1.2.3.4/` 是错误写法，应使用 `ssh root@1.2.3.4`。

## 更新后端

进入服务器上的项目目录：

```bash
cd /path/to/Astra-AI
```

拉取最新代码：

```bash
git fetch origin
git status --short
git pull --ff-only origin main
```

如果 `git status --short` 显示服务器上有未提交改动，先确认这些改动是否是运维配置或临时修改，不要直接覆盖。

更新容器：

```bash
docker compose build api
docker compose up -d api
```

查看运行状态和日志：

```bash
docker compose ps
docker compose logs -f --tail=100 api
```

健康检查：

```bash
curl http://127.0.0.1:8010/health
curl https://astra-api.wlait.com/health
```

两个检查都应返回：

```json
{"status":"ok"}
```

## 环境变量

生产环境变量应通过服务器环境、compose override、云平台密钥或私有 `.env` 注入，不要提交到仓库。

常用变量：

```bash
ASTRA_DATABASE_URL=sqlite:///./data/astra.db
ASTRA_LLM_BASE_URL=https://api.openai.com/v1
ASTRA_LLM_API_KEY=sk-...
ASTRA_LLM_MODEL=gpt-4o-mini
ASTRA_LLM_TIMEOUT_SECONDS=60
```

多模型路由可选变量：

```bash
ASTRA_LLM_MODEL_PROFILES='{"default":{"model":"gpt-4o-mini"},"strong":{"model":"gpt-4o"}}'
ASTRA_LLM_STAGE_ROUTING='{"debate":"strong","judge_and_summarize":"strong"}'
ASTRA_LLM_ROLE_ROUTING='{}'
```

如果没有配置 LLM 地址或 API Key，后端会使用本地 fallback，Session 仍可完成。

## 数据备份

更新前如需备份 SQLite 数据库：

```bash
mkdir -p backups
cp data/astra.db "backups/astra-$(date +%Y%m%d-%H%M%S).db"
```

确认备份存在：

```bash
ls -lh backups/
```

## 回滚

如果更新后健康检查失败：

```bash
docker compose logs --tail=200 api
git log --oneline -5
```

回到上一个已知可用版本：

```bash
git checkout <previous-commit>
docker compose build api
docker compose up -d api
curl http://127.0.0.1:8010/health
```

回滚后应记录失败 commit、错误日志和处理结果，再决定是否重新部署 `main`。

