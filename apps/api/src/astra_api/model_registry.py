import json
from dataclasses import dataclass
from typing import Any

from astra_api.config import settings


@dataclass(frozen=True)
class ModelProfileConfig:
    name: str
    model: str
    base_url: str | None = None
    api_key: str | None = None


def parse_profiles(raw_profiles: str | None = None) -> dict[str, ModelProfileConfig]:
    """Parse configured model profiles and inherit global connection settings when omitted."""

    raw = settings.llm_model_profiles if raw_profiles is None else raw_profiles
    if not raw.strip():
        return {}

    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError("ASTRA_LLM_MODEL_PROFILES must be a JSON object")

    profiles: dict[str, ModelProfileConfig] = {}
    for name, value in parsed.items():
        if not isinstance(name, str) or not name.strip():
            raise ValueError("Model profile name must be a non-empty string")
        if not isinstance(value, dict):
            raise ValueError(f"Model profile {name} must be a JSON object")
        model = value.get("model")
        if not isinstance(model, str) or not model.strip():
            raise ValueError(f"Model profile {name} must define a model")
        base_url = _optional_string(value.get("base_url")) or settings.llm_base_url
        api_key = _optional_string(value.get("api_key")) or settings.llm_api_key
        profiles[name] = ModelProfileConfig(
            name=name,
            model=model,
            base_url=base_url,
            api_key=api_key,
        )
    return profiles


def parse_routing(raw_routing: str | None = None) -> dict[str, str]:
    """Parse a stage or role routing JSON object into a plain string mapping."""

    raw = "" if raw_routing is None else raw_routing
    if not raw.strip():
        return {}
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError("Routing config must be a JSON object")
    routing: dict[str, str] = {}
    for key, value in parsed.items():
        if not isinstance(key, str) or not isinstance(value, str) or not key.strip() or not value.strip():
            raise ValueError("Routing config must map non-empty strings to non-empty strings")
        routing[key] = value
    return routing


def list_available_profiles() -> dict[str, ModelProfileConfig]:
    """Return configured profiles, or an implicit default profile for single-model compatibility."""

    profiles = parse_profiles()
    if profiles:
        return profiles
    return {
        "default": ModelProfileConfig(
            name="default",
            model=settings.llm_model,
            base_url=settings.llm_base_url,
            api_key=settings.llm_api_key,
        )
    }


def resolve_model(
    *,
    stage: str,
    role: Any | None = None,
    model_overrides: dict[str, str] | None = None,
) -> ModelProfileConfig:
    """Resolve the effective model in the documented override/routing/default order."""

    configured_profiles = parse_profiles()
    profiles = configured_profiles or list_available_profiles()
    stage_routing = parse_routing(settings.llm_stage_routing)
    role_routing = parse_routing(settings.llm_role_routing)
    role_code = _role_code(role)

    for profile_name in (
        (model_overrides or {}).get(stage),
        role_routing.get(role_code) if role_code else None,
        stage_routing.get(stage),
        "default" if "default" in profiles else None,
    ):
        if not profile_name:
            continue
        profile = profiles.get(profile_name)
        if profile is None:
            raise ValueError(f"Model profile not found: {profile_name}")
        return profile

    # No profile matched. Keep legacy single-model behavior as the final fallback.
    return ModelProfileConfig(
        name="legacy",
        model=settings.llm_model,
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
    )


def _role_code(role: Any | None) -> str | None:
    if role is None:
        return None
    if isinstance(role, str):
        return role
    code = getattr(role, "code", None)
    return code if isinstance(code, str) else None


def _optional_string(value: object) -> str | None:
    return value if isinstance(value, str) and value.strip() else None
