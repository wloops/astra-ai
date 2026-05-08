import json
import math
import struct
from itertools import combinations
from typing import Any

from sqlmodel import Session, select

from astra_api.db import engine
from astra_api.llm_gateway import LLMGateway
from astra_api.models import (
    DiscussionSession,
    EventType,
    KnowledgeEntry,
    Project,
    ScenarioTemplate,
    SessionEvent,
    SessionResult,
    SessionStatus,
    utc_now,
)


SIMILAR_CASE_THRESHOLD = 0.5
GRAPH_SIMILARITY_THRESHOLD = 0.75
gateway = LLMGateway()


async def generate_embedding(text: str) -> list[float] | None:
    return await gateway.generate_embedding(text)


def serialize_embedding(vector: list[float] | None) -> bytes | None:
    if not vector:
        return None
    return struct.pack(f"{len(vector)}f", *vector)


def deserialize_embedding(blob: bytes | None) -> list[float] | None:
    if not blob:
        return None
    if len(blob) % 4 != 0:
        return None
    return list(struct.unpack(f"{len(blob) // 4}f", blob))


def cosine_similarity(left: list[float] | None, right: list[float] | None) -> float | None:
    if not left or not right or len(left) != len(right):
        return None
    dot = sum(a * b for a, b in zip(left, right, strict=False))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if left_norm == 0 or right_norm == 0:
        return None
    return dot / (left_norm * right_norm)


def _json_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def _entry_search_text(discussion: DiscussionSession, result: SessionResult) -> str:
    # search_text is intentionally broad: it powers both embedding generation and LIKE fallback.
    parts = [
        discussion.topic,
        result.final_conclusion,
        _json_text(result.key_conflicts),
        _json_text(result.role_summaries),
        _json_text(result.risks),
        _json_text(result.actions),
        result.markdown_minutes,
    ]
    return "\n".join(part for part in parts if part)


def _tags_from_result(result: SessionResult, scenario: ScenarioTemplate | None) -> list[str]:
    tags = [scenario.code] if scenario is not None and scenario.code else []
    for item in result.risks[:3]:
        if isinstance(item, dict) and item.get("level"):
            tags.append(str(item["level"]))
    return list(dict.fromkeys(tags))


async def create_entry(session_id: str, db: Session | None = None) -> KnowledgeEntry | None:
    owns_session = db is None
    db = db or Session(engine, expire_on_commit=False)
    try:
        discussion = db.get(DiscussionSession, session_id)
        result = db.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first()
        if discussion is None or result is None or discussion.status != SessionStatus.COMPLETED:
            return None
        scenario = db.get(ScenarioTemplate, discussion.scenario_id)
        user_id = discussion.user_id or ""
        if not user_id:
            project = db.get(Project, discussion.project_id)
            user_id = project.user_id if project and project.user_id else ""
        if not user_id:
            return None

        search_text = _entry_search_text(discussion, result)
        embedding = serialize_embedding(await generate_embedding(search_text))
        existing = db.exec(
            select(KnowledgeEntry).where(KnowledgeEntry.source_session_id == session_id)
        ).first()
        values = {
            "project_id": discussion.project_id,
            "user_id": user_id,
            "scenario_code": scenario.code if scenario is not None else "",
            "topic": discussion.topic,
            "conclusion": result.final_conclusion,
            "key_conflicts": result.key_conflicts,
            "role_summaries": result.role_summaries,
            "risks": result.risks,
            "actions": result.actions,
            "tags": _tags_from_result(result, scenario),
            "search_text": search_text,
            "embedding": embedding,
            "updated_at": utc_now(),
        }
        if existing is None:
            existing = KnowledgeEntry(source_session_id=session_id, **values)
        else:
            for key, value in values.items():
                setattr(existing, key, value)
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    finally:
        if owns_session:
            db.close()


def _filtered_entries(
    db: Session,
    *,
    user_id: str,
    project_id: str | None = None,
    scenario: str | None = None,
) -> list[KnowledgeEntry]:
    statement = select(KnowledgeEntry).where(KnowledgeEntry.user_id == user_id)
    if project_id:
        statement = statement.where(KnowledgeEntry.project_id == project_id)
    if scenario:
        statement = statement.where(KnowledgeEntry.scenario_code == scenario)
    return db.exec(statement).all()


def _like_results(entries: list[KnowledgeEntry], query: str) -> list[tuple[KnowledgeEntry, float | None]]:
    lowered = query.lower()
    if not lowered:
        return [(entry, None) for entry in entries]
    matches = [entry for entry in entries if lowered in entry.search_text.lower()]
    return [(entry, None) for entry in matches]


async def search_entries(
    query: str,
    user_id: str,
    db: Session,
    *,
    project_id: str | None = None,
    scenario: str | None = None,
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[tuple[KnowledgeEntry, float | None]], int]:
    entries = _filtered_entries(db, user_id=user_id, project_id=project_id, scenario=scenario)
    if not query.strip():
        ordered = sorted(entries, key=lambda entry: entry.created_at, reverse=True)
        return [(entry, None) for entry in ordered[offset : offset + limit]], len(ordered)

    query_embedding = await generate_embedding(query)
    if query_embedding is None:
        results = _like_results(entries, query)
        return results[offset : offset + limit], len(results)

    scored: list[tuple[KnowledgeEntry, float]] = []
    for entry in entries:
        score = cosine_similarity(query_embedding, deserialize_embedding(entry.embedding))
        if score is not None:
            scored.append((entry, score))
    if not scored:
        results = _like_results(entries, query)
        return results[offset : offset + limit], len(results)

    scored.sort(key=lambda item: item[1], reverse=True)
    return scored[offset : offset + limit], len(scored)


async def get_similar_entries(
    topic: str,
    user_id: str,
    db: Session,
    *,
    limit: int = 3,
) -> list[tuple[KnowledgeEntry, float | None]]:
    results, _ = await search_entries(topic, user_id, db, limit=max(limit, 20))
    filtered = [
        (entry, score)
        for entry, score in results
        if score is None or score >= SIMILAR_CASE_THRESHOLD
    ]
    return filtered[:limit]


def list_entries(
    db: Session,
    *,
    user_id: str,
    offset: int = 0,
    limit: int = 20,
    project_id: str | None = None,
    scenario: str | None = None,
) -> tuple[list[KnowledgeEntry], int]:
    entries = _filtered_entries(db, user_id=user_id, project_id=project_id, scenario=scenario)
    ordered = sorted(entries, key=lambda entry: entry.created_at, reverse=True)
    return ordered[offset : offset + limit], len(ordered)


def _project_names(db: Session, entries: list[KnowledgeEntry]) -> dict[str, str]:
    names: dict[str, str] = {}
    for project_id in {entry.project_id for entry in entries}:
        project = db.get(Project, project_id)
        names[project_id] = project.name if project is not None else project_id
    return names


def get_graph_data(
    user_id: str,
    db: Session,
    *,
    project_id: str | None = None,
    limit: int = 50,
) -> dict[str, list[dict[str, Any]]]:
    entries = _filtered_entries(db, user_id=user_id, project_id=project_id)
    entries = sorted(entries, key=lambda entry: entry.created_at, reverse=True)[:limit]
    project_names = _project_names(db, entries)
    nodes = [
        {
            "id": entry.id,
            "topic": entry.topic,
            "project_id": entry.project_id,
            "project": project_names.get(entry.project_id, entry.project_id),
            "scenario": entry.scenario_code,
            "reference_count": entry.reference_count,
            "created_at": entry.created_at,
        }
        for entry in entries
    ]

    edges: dict[tuple[str, str, str], dict[str, Any]] = {}
    for left, right in combinations(entries, 2):
        if left.project_id == right.project_id:
            edges[(left.id, right.id, "SAME_PROJECT")] = {
                "source": left.id,
                "target": right.id,
                "type": "SAME_PROJECT",
                "weight": 0.3,
            }
        score = cosine_similarity(deserialize_embedding(left.embedding), deserialize_embedding(right.embedding))
        if score is not None and score >= GRAPH_SIMILARITY_THRESHOLD:
            edges[(left.id, right.id, "SEMANTIC_SIMILAR")] = {
                "source": left.id,
                "target": right.id,
                "type": "SEMANTIC_SIMILAR",
                "weight": score,
            }

    entry_by_session = {entry.source_session_id: entry.id for entry in entries}
    entry_ids = {entry.id for entry in entries}
    reference_events = db.exec(select(SessionEvent).where(SessionEvent.type == EventType.KNOWLEDGE_REFERENCED)).all()
    for event in reference_events:
        source_id = entry_by_session.get(event.session_id)
        if source_id is None:
            continue
        matches = event.payload.get("matches") if isinstance(event.payload, dict) else None
        if not isinstance(matches, list):
            continue
        for match in matches:
            if not isinstance(match, dict):
                continue
            target_id = str(match.get("entry_id") or "")
            if target_id in entry_ids and target_id != source_id:
                edges[(source_id, target_id, "EXPLICIT_REFERENCE")] = {
                    "source": source_id,
                    "target": target_id,
                    "type": "EXPLICIT_REFERENCE",
                    "weight": 0.9,
                }
    return {"nodes": nodes, "edges": list(edges.values())}


async def backfill_missing_entries() -> int:
    created = 0
    with Session(engine, expire_on_commit=False) as db:
        completed = db.exec(
            select(DiscussionSession).where(DiscussionSession.status == SessionStatus.COMPLETED)
        ).all()
        for discussion in completed:
            existing = db.exec(
                select(KnowledgeEntry).where(KnowledgeEntry.source_session_id == discussion.id)
            ).first()
            if existing is not None:
                continue
            entry = await create_entry(discussion.id, db)
            if entry is not None:
                created += 1
    return created
