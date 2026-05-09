import json

import pytest

from astra_api.config import settings
from astra_api.llm_gateway import LLMGateway
from astra_api.models import AgentRole, Project


class FakeResponse:
    def __init__(self, content: dict[str, object]) -> None:
        self.content = content

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return {
            "choices": [
                {
                    "message": {
                        "content": json.dumps(self.content, ensure_ascii=False),
                    }
                }
            ]
        }


class FakeAsyncClient:
    requests: list[dict[str, object]] = []
    response_content: dict[str, object] = {}

    def __init__(self, *args: object, **kwargs: object) -> None:
        return None

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def post(self, url: str, *, json: dict[str, object], headers: dict[str, str]) -> FakeResponse:
        self.requests.append({"url": url, "json": json, "headers": headers})
        return FakeResponse(self.response_content)


@pytest.mark.asyncio
async def test_gateway_dispatches_stage_specific_prompt(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.requests = []
    FakeAsyncClient.response_content = {"summary": "已识别争议", "conflicts": [{"title": "范围", "judgement": "限制推进"}]}
    monkeypatch.setattr("astra_api.llm_gateway.httpx.AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(settings, "llm_base_url", "https://example.test/v1/chat/completions")
    monkeypatch.setattr(settings, "llm_api_key", "test-key")

    output = await LLMGateway().complete_structured(
        role=None,
        stage="detect_conflict",
        topic="是否自动结算小额发票？",
        project=Project(name="差旅报销"),
        context={"role_outputs": []},
    )

    messages = FakeAsyncClient.requests[0]["json"]["messages"]
    assert "冲突识别器" in messages[0]["content"]
    assert output["conflicts"] == [{"title": "范围", "judgement": "限制推进"}]
    assert output["stance"] == "neutral"
    assert output["actions"] == []


def test_gateway_accepts_provider_base_url_or_full_endpoint() -> None:
    gateway = LLMGateway()

    assert gateway._chat_completions_url("https://api.deepseek.com") == "https://api.deepseek.com/chat/completions"
    assert gateway._chat_completions_url("https://api.deepseek.com/v1") == "https://api.deepseek.com/v1/chat/completions"
    assert gateway._chat_completions_url("https://api.deepseek.com/chat/completions") == "https://api.deepseek.com/chat/completions"


@pytest.mark.asyncio
async def test_gateway_parses_remote_json_and_defaults_missing_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.requests = []
    FakeAsyncClient.response_content = {
        "summary": "建议受限推进",
        "final_conclusion": "先做 200 元以内 MVP",
        "risks": [{"name": "审计缺口", "level": "medium"}],
    }
    monkeypatch.setattr("astra_api.llm_gateway.httpx.AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(settings, "llm_base_url", "https://example.test/v1/chat/completions")
    monkeypatch.setattr(settings, "llm_api_key", "test-key")

    output = await LLMGateway().complete_structured(
        role=AgentRole(name="产品经理", code="product_manager"),
        stage="judge_and_summarize",
        topic="是否自动结算小额发票？",
        project=Project(name="差旅报销"),
        context={"conflicts": []},
    )

    assert output["summary"] == "建议受限推进"
    assert output["final_conclusion"] == "先做 200 元以内 MVP"
    assert output["risks"] == [{"name": "审计缺口", "level": "medium"}]
    assert output["open_questions"] == []
    assert output["actions"] == []


@pytest.mark.asyncio
async def test_gateway_uses_model_profile_override(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.requests = []
    FakeAsyncClient.response_content = {"summary": "ok"}
    monkeypatch.setattr("astra_api.llm_gateway.httpx.AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(
        settings,
        "llm_model_profiles",
        '{"default":{"model":"mini","base_url":"https://default.test/v1","api_key":"default-key"},"strong":{"model":"strong-model","base_url":"https://strong.test/v1","api_key":"strong-key"}}',
    )
    monkeypatch.setattr(settings, "llm_stage_routing", "{}")
    monkeypatch.setattr(settings, "llm_role_routing", "{}")

    output = await LLMGateway().complete_structured(
        role=None,
        stage="debate",
        topic="test",
        project=Project(name="test"),
        context={},
        model_overrides={"debate": "strong"},
    )

    request = FakeAsyncClient.requests[0]
    assert request["url"] == "https://strong.test/v1/chat/completions"
    assert request["json"]["model"] == "strong-model"
    assert request["headers"]["Authorization"] == "Bearer strong-key"
    assert output["model_used"] == "strong-model"


@pytest.mark.asyncio
async def test_host_role_routing_applies_to_host_decisions(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.requests = []
    FakeAsyncClient.response_content = {
        "action": "CONCLUDE",
        "reason": "已完成研讨",
        "roles": [],
    }
    monkeypatch.setattr("astra_api.llm_gateway.httpx.AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(
        settings,
        "llm_model_profiles",
        '{"default":{"model":"mini","base_url":"https://default.test/v1","api_key":"default-key"},"strong":{"model":"strong-model","base_url":"https://strong.test/v1","api_key":"strong-key"}}',
    )
    monkeypatch.setattr(settings, "llm_stage_routing", "{}")
    monkeypatch.setattr(settings, "llm_role_routing", '{"host":"strong"}')

    decision = await LLMGateway().host_decide(
        topic="test",
        project=Project(name="test"),
        context={"suggested_stages": [], "completed_stages": []},
    )

    request = FakeAsyncClient.requests[0]
    assert request["url"] == "https://strong.test/v1/chat/completions"
    assert request["json"]["model"] == "strong-model"
    assert decision["model_used"] == "strong-model"


@pytest.mark.asyncio
async def test_complete_remote_without_profile_args_uses_global_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.requests = []
    FakeAsyncClient.response_content = {"summary": "ok"}
    monkeypatch.setattr("astra_api.llm_gateway.httpx.AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(settings, "llm_base_url", "https://legacy.test/v1")
    monkeypatch.setattr(settings, "llm_api_key", "legacy-key")
    monkeypatch.setattr(settings, "llm_model", "legacy-model")

    await LLMGateway()._complete_remote(
        role=None,
        stage="clarify_topic",
        topic="test",
        project=Project(name="test"),
        context={},
    )

    request = FakeAsyncClient.requests[0]
    assert request["url"] == "https://legacy.test/v1/chat/completions"
    assert request["json"]["model"] == "legacy-model"


# --- 1.1: 重试行为测试 ---


class FakeResponseWithStatus(FakeResponse):
    def __init__(self, status_code: int, content: dict[str, object] | None = None) -> None:
        self.status_code = status_code
        self.content = content or {}

    def raise_for_status(self) -> None:
        import httpx
        if self.status_code >= 400:
            resp = httpx.Response(status_code=self.status_code)
            resp._content = json.dumps(self.content).encode()
            raise httpx.HTTPStatusError("error", request=None, response=resp)


class FakeRetryClient:
    call_count = 0
    response_content: dict[str, object] = {}
    fail_count: int = 0
    fail_status: int = 500

    def __init__(self, *args: object, **kwargs: object) -> None:
        return None

    async def __aenter__(self) -> "FakeRetryClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def post(self, url: str, *, json: dict[str, object], headers: dict[str, str]) -> FakeResponse:
        FakeRetryClient.call_count += 1
        if FakeRetryClient.call_count <= FakeRetryClient.fail_count:
            return FakeResponseWithStatus(FakeRetryClient.fail_status)
        return FakeResponse(FakeRetryClient.response_content)


@pytest.mark.asyncio
async def test_gateway_retries_on_5xx_then_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    """5xx 错误 → 重试 2 次 → 第三次成功"""
    FakeRetryClient.call_count = 0
    FakeRetryClient.fail_count = 2
    FakeRetryClient.fail_status = 500
    FakeRetryClient.response_content = {"summary": "重试后成功", "stance": "ok"}

    monkeypatch.setattr("astra_api.llm_gateway.httpx.AsyncClient", FakeRetryClient)
    monkeypatch.setattr(settings, "llm_base_url", "https://example.test")
    monkeypatch.setattr(settings, "llm_api_key", "test-key")

    output = await LLMGateway().complete_structured(
        role=None, stage="clarify_topic", topic="测试", project=Project(name="test"), context={},
    )
    assert FakeRetryClient.call_count == 3
    assert output["summary"] == "重试后成功"


@pytest.mark.asyncio
async def test_gateway_retries_then_falls_back_to_local(monkeypatch: pytest.MonkeyPatch) -> None:
    """5xx 持续失败 → 重试 2 次 → 总共 3 次调用 → fallback 到本地"""
    FakeRetryClient.call_count = 0
    FakeRetryClient.fail_count = 10  # 永远失败
    FakeRetryClient.fail_status = 503
    FakeRetryClient.response_content = {}

    monkeypatch.setattr("astra_api.llm_gateway.httpx.AsyncClient", FakeRetryClient)
    async def fake_sleep(_: float) -> None: return None
    monkeypatch.setattr("astra_api.llm_gateway.asyncio.sleep", fake_sleep)
    monkeypatch.setattr(settings, "llm_base_url", "https://example.test")
    monkeypatch.setattr(settings, "llm_api_key", "test-key")

    output = await LLMGateway().complete_structured(
        role=None, stage="clarify_topic", topic="测试", project=Project(name="test"), context={},
    )
    assert FakeRetryClient.call_count == 3  # 初始 + 2 次重试
    assert output["stance"] == "needs_structured_review"  # 本地 fallback 输出


@pytest.mark.asyncio
async def test_gateway_no_retry_on_4xx(monkeypatch: pytest.MonkeyPatch) -> None:
    """4xx 错误不重试，直接抛异常"""
    FakeRetryClient.call_count = 0
    FakeRetryClient.fail_count = 10
    FakeRetryClient.fail_status = 401
    FakeRetryClient.response_content = {}

    monkeypatch.setattr("astra_api.llm_gateway.httpx.AsyncClient", FakeRetryClient)
    monkeypatch.setattr(settings, "llm_base_url", "https://example.test")
    monkeypatch.setattr(settings, "llm_api_key", "test-key")

    with pytest.raises(Exception):  # HTTPStatusError or propagated
        await LLMGateway().complete_structured(
            role=None, stage="clarify_topic", topic="测试", project=Project(name="test"), context={},
        )
    assert FakeRetryClient.call_count == 1  # 不重试


# --- 1.2: 本地 fallback 各阶段测试 ---


@pytest.mark.asyncio
async def test_local_fallback_clarify_topic(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)
    output = await LLMGateway().complete_structured(
        role=None, stage="clarify_topic", topic="测试", project=Project(name="测试项目"), context={},
    )
    assert output["stance"] == "needs_structured_review"
    assert len(output["open_questions"]) > 0


@pytest.mark.asyncio
async def test_local_fallback_detect_conflict(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)
    output = await LLMGateway().complete_structured(
        role=None, stage="detect_conflict", topic="测试", project=Project(name="测试项目"), context={"role_outputs": []},
    )
    assert output["conflicts"] is not None
    assert len(output["conflicts"]) > 0
    assert "title" in output["conflicts"][0]


@pytest.mark.asyncio
async def test_local_fallback_debate(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)
    output = await LLMGateway().complete_structured(
        role=None, stage="debate", topic="测试", project=Project(name="测试项目"), context={},
    )
    assert output["stance"] == "debate_summarized"
    assert len(output["summary"]) > 0


@pytest.mark.asyncio
async def test_local_fallback_judge_and_summarize(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)
    output = await LLMGateway().complete_structured(
        role=None, stage="judge_and_summarize", topic="测试", project=Project(name="测试项目"), context={},
    )
    assert output["final_conclusion"] is not None
    assert len(output["risks"]) > 0


@pytest.mark.asyncio
async def test_local_fallback_generate_actions(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)
    output = await LLMGateway().complete_structured(
        role=None, stage="generate_actions", topic="测试", project=Project(name="测试项目"), context={},
    )
    assert output["stance"] == "actions_generated"
    assert len(output["actions"]) > 0
    assert "title" in output["actions"][0]


@pytest.mark.asyncio
async def test_local_fallback_per_role(monkeypatch: pytest.MonkeyPatch) -> None:
    """每个角色的本地 fallback 产出不同观点"""
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)
    pm_out = await LLMGateway().complete_structured(
        role=AgentRole(name="产品经理", code="product_manager"), stage="independent_review",
        topic="测试", project=Project(name="test"), context={},
    )
    arch_out = await LLMGateway().complete_structured(
        role=AgentRole(name="后端架构师", code="backend_architect"), stage="independent_review",
        topic="测试", project=Project(name="test"), context={},
    )
    qa_out = await LLMGateway().complete_structured(
        role=AgentRole(name="测试工程师", code="qa_engineer"), stage="independent_review",
        topic="测试", project=Project(name="test"), context={},
    )
    # 各角色输出应该不同
    assert pm_out["summary"] != arch_out["summary"]
    assert arch_out["summary"] != qa_out["summary"]


def test_reads_llm_timeout_from_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_timeout_seconds", 30.0)
    assert settings.llm_timeout_seconds == 30.0


@pytest.mark.asyncio
async def test_local_host_decision_parallel_then_conclude(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)
    gateway = LLMGateway()

    decision = await gateway.host_decide(
        topic="test",
        project=Project(name="test"),
        context={
            "suggested_stages": ["init_session", "load_context", "independent_review", "finalize_minutes"],
            "completed_stages": ["init_session", "load_context"],
            "active_role_codes": ["host", "product_manager", "qa_engineer"],
            "skipped_stages": [],
        },
    )
    assert decision["action"] == "PARALLEL_RUN"
    assert decision["stage"] == "independent_review"
    assert decision["roles"] == ["product_manager", "qa_engineer"]

    conclude = await gateway.host_decide(
        topic="test",
        project=Project(name="test"),
        context={
            "suggested_stages": ["init_session", "load_context", "finalize_minutes"],
            "completed_stages": ["init_session", "load_context"],
            "active_role_codes": ["host"],
            "skipped_stages": [],
        },
    )
    assert conclude["action"] == "CONCLUDE"


@pytest.mark.asyncio
async def test_local_initial_role_plan_preserves_user_roles_and_adds_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    plan = await LLMGateway().plan_initial_roles(
        topic="test",
        project=Project(name="test"),
        context={
            "user_selected_role_codes": ["host", "product_manager"],
            "default_role_codes": ["host", "product_manager", "backend_architect", "qa_engineer"],
            "available_roles": [
                {"code": "host"},
                {"code": "product_manager"},
                {"code": "backend_architect"},
                {"code": "qa_engineer"},
            ],
        },
    )

    assert plan["phase"] == "initial_planning"
    assert plan["selected_role_codes"] == ["host", "product_manager", "backend_architect", "qa_engineer"]
    assert plan["role_reasons"]["product_manager"] == "用户已选择该角色"
