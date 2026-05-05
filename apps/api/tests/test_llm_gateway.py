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
