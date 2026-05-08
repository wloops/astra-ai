import pytest
from uuid import uuid4
from sqlmodel import select

from astra_api.db import get_session
from astra_api.knowledge import (
    create_entry,
    deserialize_embedding,
    get_graph_data,
    get_similar_entries,
    search_entries,
)
from astra_api.models import (
    DiscussionSession,
    KnowledgeEntry,
    Project,
    ScenarioTemplate,
    SessionResult,
    SessionStatus,
    User,
)
from astra_api.auth import hash_password


def _make_user(db, username: str) -> User:
    user = User(username=f"{username}_{uuid4().hex[:8]}", hashed_password=hash_password("secret"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _make_completed_session(db, user: User, project: Project | None = None, topic: str = "alpha decision") -> str:
    suffix = uuid4().hex[:8]
    project = project or Project(name=f"project {topic}", user_id=user.id)
    scenario = ScenarioTemplate(name=f"scenario {topic}", code=f"scenario_{topic.replace(' ', '_')}_{suffix}")
    db.add(project)
    db.add(scenario)
    db.commit()
    db.refresh(project)
    db.refresh(scenario)
    discussion = DiscussionSession(
        project_id=project.id,
        scenario_id=scenario.id,
        topic=topic,
        role_ids=[],
        user_id=user.id,
        status=SessionStatus.COMPLETED,
        current_stage="finalize_minutes",
    )
    db.add(discussion)
    db.commit()
    db.refresh(discussion)
    result = SessionResult(
        session_id=discussion.id,
        final_conclusion=f"{topic} final conclusion",
        key_conflicts=[{"title": f"{topic} conflict"}],
        role_summaries=[{"summary": f"{topic} role summary"}],
        risks=[{"name": f"{topic} risk", "level": "medium"}],
        actions=[{"title": f"{topic} action"}],
        markdown_minutes=f"# {topic}",
    )
    db.add(result)
    db.commit()
    return discussion.id


async def _fake_embedding(text: str) -> list[float] | None:
    lowered = text.lower()
    if "alpha" in lowered:
        return [1.0, 0.0]
    if "beta" in lowered:
        return [0.0, 1.0]
    return [0.9, 0.1]


@pytest.mark.asyncio
async def test_create_entry_is_idempotent_and_stores_embedding(monkeypatch) -> None:
    monkeypatch.setattr("astra_api.knowledge.generate_embedding", _fake_embedding)
    with next(get_session()) as db:
        user = _make_user(db, "kb_idempotent")
        session_id = _make_completed_session(db, user, topic="alpha idempotent")
        first = await create_entry(session_id, db)
        second = await create_entry(session_id, db)
        entries = db.exec(select(KnowledgeEntry).where(KnowledgeEntry.source_session_id == session_id)).all()

    assert first is not None
    assert second is not None
    assert first.id == second.id
    assert len(entries) == 1
    assert deserialize_embedding(entries[0].embedding) == pytest.approx([1.0, 0.0])


@pytest.mark.asyncio
async def test_semantic_search_and_similar_cases(monkeypatch) -> None:
    monkeypatch.setattr("astra_api.knowledge.generate_embedding", _fake_embedding)
    with next(get_session()) as db:
        user = _make_user(db, "kb_semantic")
        await create_entry(_make_completed_session(db, user, topic="alpha rollout"), db)
        await create_entry(_make_completed_session(db, user, topic="beta rollout"), db)

        results, total = await search_entries("alpha", user.id, db, limit=10)
        similar = await get_similar_entries("alpha", user.id, db, limit=3)

    assert total == 2
    assert results[0][0].topic == "alpha rollout"
    assert results[0][1] == pytest.approx(1.0)
    assert [item[0].topic for item in similar] == ["alpha rollout"]


@pytest.mark.asyncio
async def test_like_fallback_when_embedding_unavailable(monkeypatch) -> None:
    async def no_embedding(_: str) -> list[float] | None:
        return None

    monkeypatch.setattr("astra_api.knowledge.generate_embedding", no_embedding)
    with next(get_session()) as db:
        user = _make_user(db, "kb_like")
        await create_entry(_make_completed_session(db, user, topic="fallback invoice"), db)
        results, total = await search_entries("invoice", user.id, db, limit=10)

    assert total == 1
    assert results[0][0].topic == "fallback invoice"
    assert results[0][1] is None


@pytest.mark.asyncio
async def test_graph_data_and_user_isolation(monkeypatch) -> None:
    monkeypatch.setattr("astra_api.knowledge.generate_embedding", _fake_embedding)
    with next(get_session()) as db:
        user_a = _make_user(db, "kb_graph_a")
        user_b = _make_user(db, "kb_graph_b")
        shared_project = Project(name="shared graph project", user_id=user_a.id)
        db.add(shared_project)
        db.commit()
        db.refresh(shared_project)
        await create_entry(_make_completed_session(db, user_a, shared_project, "alpha graph one"), db)
        await create_entry(_make_completed_session(db, user_a, shared_project, "alpha graph two"), db)
        await create_entry(_make_completed_session(db, user_b, topic="alpha private"), db)

        graph = get_graph_data(user_a.id, db, limit=10)
        results, _ = await search_entries("alpha", user_a.id, db, limit=10)

    assert len(graph["nodes"]) == 2
    assert {edge["type"] for edge in graph["edges"]} >= {"SAME_PROJECT", "SEMANTIC_SIMILAR"}
    assert all(entry.user_id == user_a.id for entry, _ in results)
