# syntax=docker/dockerfile:1.7
FROM python:3.12-slim

WORKDIR /app

# Pin uv so production builds are repeatable.
COPY --from=ghcr.io/astral-sh/uv:0.6.17 /uv /uvx /usr/local/bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_HTTP_TIMEOUT=120

# Copy project files for dependency install
COPY apps/api/pyproject.toml apps/api/uv.lock* apps/api/

# Install dependencies. UV_INDEX_URL can point to a faster private or regional
# index on slow production networks without changing the committed image recipe.
ARG UV_INDEX_URL=
RUN --mount=type=cache,target=/root/.cache/uv \
    cd apps/api && \
    for attempt in 1 2 3; do \
      if [ -n "$UV_INDEX_URL" ]; then \
        UV_INDEX_URL="$UV_INDEX_URL" uv sync --frozen --no-dev; \
      else \
        uv sync --frozen --no-dev; \
      fi && break; \
      if [ "$attempt" = "3" ]; then exit 1; fi; \
      sleep 5; \
    done

# Copy source code
COPY apps/api/src apps/api/src/

# Ensure data directory exists
RUN mkdir -p /app/data

EXPOSE 8010

CMD ["uv", "run", "--project", "apps/api", "uvicorn", "--app-dir", "apps/api/src", "astra_api.main:app", "--host", "0.0.0.0", "--port", "8010"]
