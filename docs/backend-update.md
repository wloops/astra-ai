# 后端部署与更新说明

本文记录 Astra AI 后端在云服务器上的推荐更新流程。当前推荐方式是“服务器本地构建优化版”：保留 `/opt/astra-ai` 与 `docker compose`，但通过更稳定的 Dockerfile、固定的部署脚本和部署后检查，避免手工复制和临时 `docker commit` 成为常规流程。

不要把真实服务器 IP、账号、密钥、生产 `.env` 或内网地址写入仓库。生产配置应保存在服务器私有文件、系统环境变量或密钥管理器中。

## 当前推荐方式

- 服务器目录：默认 `/opt/astra-ai`。
- 后端服务：Docker Compose 服务名 `api`。
- 容器端口：`127.0.0.1:8010:8010`。
- 数据目录：`./data:/app/data`，默认 SQLite 文件为 `data/astra.db`。
- 生产环境变量：通过服务器本地 `.env` 或 `docker-compose.override.yml` 注入。
- 更新方式：本地执行 `scripts/deploy-api.ps1`，由脚本同步后端文件、备份数据库、远程构建、重启并检查健康状态。

CI 构建镜像可以作为未来升级项，但当前不作为默认路径。原因是 GitHub Actions 可能排队，镜像仓库和 secrets 也会增加维护面；当前阶段优先把服务器本地构建做稳定。

## 本地前提

部署脚本从本机 PowerShell 执行，需要安装：

- `git`
- `ssh`
- `scp`
- `curl`
- `npm`

设置部署目标：

```powershell
$env:ASTRA_DEPLOY_HOST = "<server-host>"
$env:ASTRA_DEPLOY_USER = "<ssh-user>"
$env:ASTRA_DEPLOY_DIR = "/opt/astra-ai"
```

如果服务器访问 Python 包源较慢，可以临时指定更快的索引：

```powershell
$env:ASTRA_DEPLOY_UV_INDEX_URL = "<python-index-url>"
```

不要把这些值写入仓库。

## 服务器前提

服务器需要已经安装：

- Docker
- Docker Compose plugin
- 可用的 SSH 免密登录

服务器目录应包含：

```text
/opt/astra-ai/
  apps/api/
  data/
  Dockerfile
  docker-compose.yml
```

生产环境变量建议通过服务器本地 `docker-compose.override.yml` 注入，例如：

```yaml
services:
  api:
    env_file:
      - apps/api/.env
```

`apps/api/.env` 只保留在服务器，权限建议为 `600`。

## 一键部署

在仓库根目录执行：

```powershell
.\scripts\deploy-api.ps1
```

脚本会执行：

1. 检查本地 git 工作区是否干净。
2. 默认运行 `npm run test:api`。
3. 检查 SSH 与远程目录。
4. 备份服务器 `data/astra.db` 到 `backups/`。
5. 同步后端部署所需文件，不同步 `.env`、数据库、缓存或虚拟环境。
6. 在服务器执行 `docker compose build api`。
7. 执行 `docker compose up -d api`。
8. 检查本机与公网健康接口。
9. 检查 `/models/profiles`。
10. 检查 LLM 环境变量是否存在，但不打印 API Key。
11. 输出最近后端日志。

脚本使用 `git archive HEAD` 生成部署包，只部署已提交内容。上线前应先完成 commit，避免未提交变更和本地临时文件进入生产环境。

可选参数：

```powershell
.\scripts\deploy-api.ps1 -SkipTests
.\scripts\deploy-api.ps1 -SkipBackup
.\scripts\deploy-api.ps1 -SkipPublicHealth
.\scripts\deploy-api.ps1 -PublicHealthUrl "https://astra-api.wlait.com/health"
```

## 手工分步部署

如需手工执行，流程如下：

```bash
cd /opt/astra-ai
mkdir -p backups
if [ -f data/astra.db ]; then cp data/astra.db "backups/astra-$(date +%Y%m%d-%H%M%S).db"; fi
docker compose build api
docker compose up -d api
docker compose ps api
```

健康检查：

```bash
curl http://127.0.0.1:8010/health
curl http://127.0.0.1:8010/models/profiles
```

公网检查：

```bash
curl https://astra-api.wlait.com/health
```

## LLM 配置检查

常用生产变量：

```bash
ASTRA_DATABASE_URL=sqlite:///./data/astra.db
ASTRA_LLM_BASE_URL=https://api.openai.com/v1
ASTRA_LLM_API_KEY=sk-...
ASTRA_LLM_MODEL=gpt-4o-mini
ASTRA_LLM_TIMEOUT=60
```

多模型路由可选变量：

```bash
ASTRA_LLM_MODEL_PROFILES='{"default":{"model":"gpt-4o-mini"},"strong":{"model":"gpt-4o"}}'
ASTRA_LLM_STAGE_ROUTING='{"debate":"strong","judge_and_summarize":"strong"}'
ASTRA_LLM_ROLE_ROUTING='{}'
```

检查容器是否拿到配置时，不要打印 API Key：

```bash
docker exec astra-api sh -lc 'for name in ASTRA_LLM_BASE_URL ASTRA_LLM_MODEL ASTRA_LLM_API_KEY ASTRA_LLM_MODEL_PROFILES ASTRA_LLM_STAGE_ROUTING ASTRA_LLM_ROLE_ROUTING; do if [ -n "${!name}" ]; then echo "${name}=SET"; else echo "${name}=MISSING"; fi; done'
```

如果 `/models/profiles` 已显示真实模型，但 Session 仍然异常秒出，需要看日志区分：

- 模型接口超时或返回 5xx，后端进入 fallback。
- LLM 环境变量没有进入容器。
- 前端仍是旧版本或没有显示模型状态。

查看日志：

```bash
docker compose logs --tail=120 api
```

重点搜索：`timeout`、`503`、`fallback`、`JSON`、`model`。

## 回滚

如果部署后健康检查失败：

```bash
cd /opt/astra-ai
docker compose logs --tail=200 api
docker compose ps api
```

然后回到上一份已知可用代码或镜像，再执行：

```bash
docker compose build api
docker compose up -d api
curl http://127.0.0.1:8010/health
```

SQLite 备份位于 `backups/`。不要在没有明确确认的情况下覆盖当前数据库；数据回滚应单独处理。

## 为什么暂不默认使用 CI 镜像发布

CI 构建镜像的优势是发布过程更标准，失败会发生在上线前，服务器只需要拉镜像和重启。但它也会引入 GitHub Actions 排队、镜像仓库、registry token、secrets 配置和镜像清理策略。

当前项目后端规模较小，服务器已经固定，优先优化服务器本地构建更直接。等服务器构建仍不可接受，或需要多人协作发布时，再升级到 CI 构建镜像与镜像仓库发布。
