FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Copy project files for dependency install
COPY apps/api/pyproject.toml apps/api/uv.lock* apps/api/

# Install dependencies
RUN cd apps/api && uv sync --frozen --no-dev

# Copy source code
COPY apps/api/src apps/api/src/

# Ensure data directory exists
RUN mkdir -p /app/data

EXPOSE 8010

CMD ["uv", "run", "--project", "apps/api", "uvicorn", "--app-dir", "apps/api/src", "astra_api.main:app", "--host", "0.0.0.0", "--port", "8010"]
