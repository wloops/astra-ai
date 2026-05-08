---
name: astra-backend-deploy
description: Deploy or verify the Astra AI backend on the production server using the repo-local Docker Compose workflow. Use when the user asks to update the backend, deploy online, restart production, check whether LLM config is active, or investigate fallback-like production behavior.
license: MIT
---

# Astra Backend Deploy

Use this skill for Astra AI backend deployment and production verification.

## Guardrails

- Reply in Chinese unless the user asks otherwise.
- Do not print or commit production secrets.
- Do not sync `apps/api/.env`, `.env`, `data/`, `.venv/`, `node_modules/`, logs, caches, or database files to the server.
- Do not use `docker commit` as a normal deployment path. Treat it only as an emergency workaround and call that out explicitly.
- Do not use `git add .`; stage only files that are clearly part of the deployment change.

## Required Inputs

The deploy script expects these local environment variables:

```powershell
$env:ASTRA_DEPLOY_HOST = "<server-host>"
$env:ASTRA_DEPLOY_USER = "<ssh-user>"
$env:ASTRA_DEPLOY_DIR = "/opt/astra-ai"
```

Optional:

```powershell
$env:ASTRA_DEPLOY_UV_INDEX_URL = "<faster-python-index>"
```

## Deploy Flow

1. Inspect `git status --short --branch`. Stop if the worktree is dirty unless the user explicitly asks for a local test only.
2. Run the backend tests unless the user explicitly asks to skip them:
   ```powershell
   npm run test:api
   ```
3. Deploy with:
   ```powershell
   .\scripts\deploy-api.ps1
   ```
4. Remember that the script deploys `HEAD` via `git archive`, so the intended deployment content must be committed first.
5. If production network access to Python packages is slow, set `ASTRA_DEPLOY_UV_INDEX_URL` and rerun the same script.

## Required Verification

After deployment, verify all of these and summarize the result:

- `GET http://127.0.0.1:8010/health` on the server.
- `GET https://astra-api.wlait.com/health` from the public endpoint.
- `GET http://127.0.0.1:8010/models/profiles` on the server.
- Container env presence for LLM variables without printing `ASTRA_LLM_API_KEY`.
- Recent `docker compose logs --tail=120 api`, especially model timeout, `503`, parsing errors, or fallback messages.

If a session still finishes suspiciously fast, distinguish these cases:

- Backend is deployed and LLM config is present, but provider calls timeout or return 5xx, causing fallback.
- Backend is deployed but LLM env is missing inside the container.
- Frontend is stale and not showing the latest backend/model state.

## Rollback

If health checks fail:

1. Read recent logs:
   ```bash
   docker compose logs --tail=200 api
   ```
2. Restore the previous known-good source or image according to the server state.
3. Keep the latest SQLite backup under `backups/` unless the user explicitly requests data restoration.
