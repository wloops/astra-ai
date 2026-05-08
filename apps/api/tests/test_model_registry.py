import pytest

from astra_api.config import settings
from astra_api.model_registry import parse_profiles, parse_routing, resolve_model
from astra_api.models import AgentRole


def test_parse_profiles_inherits_global_connection(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", "https://example.test/v1")
    monkeypatch.setattr(settings, "llm_api_key", "global-key")

    profiles = parse_profiles('{"default":{"model":"gpt-4o-mini"},"strong":{"model":"gpt-4o","api_key":"strong-key"}}')

    assert profiles["default"].base_url == "https://example.test/v1"
    assert profiles["default"].api_key == "global-key"
    assert profiles["strong"].model == "gpt-4o"
    assert profiles["strong"].api_key == "strong-key"


def test_parse_routing_requires_string_mapping() -> None:
    assert parse_routing('{"debate":"strong"}') == {"debate": "strong"}
    with pytest.raises(ValueError):
        parse_routing('{"debate": 1}')


def test_resolve_model_uses_priority_chain(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        settings,
        "llm_model_profiles",
        '{"default":{"model":"mini"},"stage":{"model":"stage-model"},"role":{"model":"role-model"},"session":{"model":"session-model"}}',
    )
    monkeypatch.setattr(settings, "llm_stage_routing", '{"debate":"stage"}')
    monkeypatch.setattr(settings, "llm_role_routing", '{"host":"role"}')
    monkeypatch.setattr(settings, "llm_model", "legacy")

    role = AgentRole(name="Host", code="host")
    assert resolve_model(stage="debate", role=role, model_overrides={"debate": "session"}).model == "session-model"
    assert resolve_model(stage="debate", role=role, model_overrides={}).model == "role-model"
    assert resolve_model(stage="debate", role=None, model_overrides={}).model == "stage-model"
    assert resolve_model(stage="clarify_topic", role=None, model_overrides={}).model == "mini"


def test_resolve_model_falls_back_to_legacy_single_model(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_model_profiles", "{}")
    monkeypatch.setattr(settings, "llm_stage_routing", "{}")
    monkeypatch.setattr(settings, "llm_role_routing", "{}")
    monkeypatch.setattr(settings, "llm_model", "legacy-model")

    assert resolve_model(stage="debate", role=None, model_overrides={}).model == "legacy-model"
