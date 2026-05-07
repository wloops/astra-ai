import asyncio

import httpx
import pytest

from astra_api.config import settings
from astra_api.main import app


@pytest.mark.asyncio
async def test_sse_streams_events_and_closes_on_completed(monkeypatch: pytest.MonkeyPatch) -> None:
    """SSE 连接 → 接收事件 → session completed → 流关闭"""
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    transport = httpx.ASGITransport(app=app)  # type: ignore[arg-type]
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 创建 session
        projects = (await client.get("/projects")).json()["items"]
        scenarios = (await client.get("/scenario-templates")).json()["items"]
        create_resp = await client.post(
            "/sessions",
            json={
                "project_id": projects[0]["id"],
                "scenario_id": scenarios[0]["id"],
                "topic": "SSE 测试话题",
            },
        )
        assert create_resp.status_code == 200
        session_id = create_resp.json()["id"]

        # 等待 workflow 完成
        for _ in range(30):
            await asyncio.sleep(0.5)
            status_resp = await client.get(f"/sessions/{session_id}")
            if status_resp.json()["status"] in ("completed", "failed"):
                break

        # 订阅 SSE 流
        events: list[str] = []
        async with client.stream("GET", f"/sessions/{session_id}/events") as response:
            assert response.status_code == 200
            async for line in response.aiter_lines():
                if line.startswith("event: "):
                    event_type = line.removeprefix("event: ")
                    events.append(event_type)

    assert len(events) > 0
    has_completed = any(e for e in events if e in ("session_completed", "session_failed"))
    assert has_completed, f"Should receive session_completed or session_failed, got: {events}"


@pytest.mark.asyncio
async def test_sse_returns_error_for_missing_session() -> None:
    """SSE 订阅不存在的 session → error 事件"""
    transport = httpx.ASGITransport(app=app)  # type: ignore[arg-type]
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        async with client.stream("GET", "/sessions/nonexistent_id/events") as response:
            got_error = False
            async for line in response.aiter_lines():
                if line == "event: session_failed":
                    got_error = True
                    break
            assert got_error, "Should receive session_failed event for missing session"
