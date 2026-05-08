param(
    [switch]$SkipTests,
    [switch]$SkipBackup,
    [switch]$SkipPublicHealth,
    [string]$PublicHealthUrl = "https://astra-api.wlait.com/health",
    [string]$UvIndexUrl = $env:ASTRA_DEPLOY_UV_INDEX_URL
)

$ErrorActionPreference = "Stop"

function Require-Env {
    param([string]$Name)
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Missing required environment variable: $Name"
    }
    return $value
}

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$FailureMessage
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

$deployHost = Require-Env "ASTRA_DEPLOY_HOST"
$deployUser = Require-Env "ASTRA_DEPLOY_USER"
$deployDir = Require-Env "ASTRA_DEPLOY_DIR"
$sshTarget = "${deployUser}@${deployHost}"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$archivePath = Join-Path ([System.IO.Path]::GetTempPath()) ("astra-api-deploy-{0}.tar" -f ([guid]::NewGuid().ToString("N")))
$remoteArchivePath = "/tmp/astra-api-deploy.tar"

Push-Location $repoRoot
try {
    Write-Host "==> Checking local git state"
    $status = git status --short
    if ($LASTEXITCODE -ne 0) {
        throw "git status failed"
    }
    if ($status) {
        Write-Host $status
        throw "Working tree is not clean. Commit or stash local changes before deploying."
    }

    if (-not $SkipTests) {
        Write-Host "==> Running backend tests"
        Invoke-Checked "npm" @("run", "test:api") "Backend tests failed"
    }

    Write-Host "==> Checking SSH connectivity"
    Invoke-Checked "ssh" @($sshTarget, "test -d '$deployDir'") "Remote deploy directory does not exist: $deployDir"

    if (-not $SkipBackup) {
        Write-Host "==> Backing up remote SQLite database"
        $backupCommand = "cd '$deployDir' && mkdir -p backups && if [ -f data/astra.db ]; then cp data/astra.db backups/astra-`$(date +%Y%m%d-%H%M%S).db; fi && ls -lh backups | tail -5"
        Invoke-Checked "ssh" @($sshTarget, $backupCommand) "Remote database backup failed"
    }

    Write-Host "==> Packaging backend deployment files"
    $deployFiles = @(
        "Dockerfile",
        ".dockerignore",
        "docker-compose.yml",
        "apps/api/pyproject.toml",
        "apps/api/uv.lock",
        "apps/api/src"
    )
    Invoke-Checked "git" (@("archive", "--format=tar", "-o", $archivePath, "HEAD") + $deployFiles) "Failed to package deployment files"

    Write-Host "==> Syncing backend deployment archive"
    Invoke-Checked "scp" @($archivePath, "${sshTarget}:$remoteArchivePath") "Failed to upload deployment archive"
    Invoke-Checked "ssh" @($sshTarget, "cd '$deployDir' && tar -xf '$remoteArchivePath' && rm -f '$remoteArchivePath'") "Failed to extract deployment archive"

    Write-Host "==> Building and restarting remote api container"
    $buildArgs = ""
    if (-not [string]::IsNullOrWhiteSpace($UvIndexUrl)) {
        $escapedIndex = $UvIndexUrl.Replace("'", "'\''")
        $buildArgs = "--build-arg UV_INDEX_URL='$escapedIndex'"
    }
    $remoteDeployCommand = "cd '$deployDir' && docker compose build $buildArgs api && docker compose up -d api && docker compose ps api"
    Invoke-Checked "ssh" @($sshTarget, $remoteDeployCommand) "Remote docker compose deployment failed"

    Write-Host "==> Checking local backend health on server"
    Invoke-Checked "ssh" @($sshTarget, "curl -fsS http://127.0.0.1:8010/health") "Remote local health check failed"

    if (-not $SkipPublicHealth) {
        Write-Host "==> Checking public backend health"
        Invoke-Checked "curl" @("-fsS", $PublicHealthUrl) "Public health check failed"
    }

    Write-Host "==> Checking model profiles"
    Invoke-Checked "ssh" @($sshTarget, "curl -fsS http://127.0.0.1:8010/models/profiles") "Model profiles check failed"

    Write-Host "==> Checking LLM environment presence without printing secrets"
    $envCheck = 'for name in ASTRA_LLM_BASE_URL ASTRA_LLM_MODEL ASTRA_LLM_API_KEY ASTRA_LLM_MODEL_PROFILES ASTRA_LLM_STAGE_ROUTING ASTRA_LLM_ROLE_ROUTING; do if docker exec astra-api sh -lc "test -n \"$(printenv $name)\""; then echo "$name=SET"; else echo "$name=MISSING"; fi; done'
    Invoke-Checked "ssh" @($sshTarget, $envCheck) "LLM environment check failed"

    Write-Host "==> Recent api logs"
    Invoke-Checked "ssh" @($sshTarget, "docker compose logs --tail=120 api") "Failed to read api logs"
}
finally {
    if (Test-Path $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    Pop-Location
}
