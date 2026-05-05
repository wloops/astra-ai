import asyncio
import json
import logging
import time
from typing import Any

import httpx

from astra_api.config import settings
from astra_api.models import AgentRole, Project

logger = logging.getLogger(__name__)


DEFAULT_OUTPUT: dict[str, Any] = {
    "summary": "",
    "stance": "neutral",
    "risks": [],
    "open_questions": [],
    "actions": [],
}


STAGE_PROMPTS: dict[str, dict[str, Any]] = {
    "clarify_topic": {
        "system": "你是 Astra 的 AI 主持人。请澄清议题范围，识别需要补充确认的问题，并只输出 JSON。",
        "schema": {
            "summary": "对议题边界和决策目标的简短澄清",
            "stance": "needs_structured_review | clear_enough | blocked",
            "risks": ["初步风险"],
            "open_questions": ["仍需确认的问题"],
            "actions": [],
        },
    },
    "independent_review": {
        "system": "你是 Astra 专家审议中的一个角色。请基于角色职责给出独立观点，并只输出 JSON。",
        "schema": {
            "summary": "角色观点摘要",
            "stance": "角色立场",
            "risks": ["该角色识别的风险"],
            "open_questions": ["该角色需要澄清的问题"],
            "actions": ["该角色建议的行动"],
        },
    },
    "detect_conflict": {
        "system": "你是 Astra 的冲突识别器。请比较各角色观点，找出真实分歧，并只输出 JSON。",
        "schema": {
            "summary": "分歧识别摘要",
            "stance": "conflicts_detected | no_major_conflict",
            "conflicts": [
                {
                    "title": "争议点标题",
                    "supporting_view": "支持推进的观点",
                    "cautious_view": "审慎或反对的观点",
                    "judgement": "主持人对争议的初步判断",
                }
            ],
            "risks": ["由争议暴露的风险"],
            "open_questions": ["需要补充判断的问题"],
            "actions": [],
        },
    },
    "debate": {
        "system": "你是 Astra 的交叉辩论主持人。请围绕争议点综合各方论证，并只输出 JSON。",
        "schema": {
            "summary": "辩论归纳总结",
            "stance": "debate_summarized",
            "risks": ["辩论后仍需关注的风险"],
            "open_questions": ["辩论后仍未解决的问题"],
            "actions": [],
        },
    },
    "judge_and_summarize": {
        "system": "你是 Astra 的最终裁决与总结者。请综合全部中间材料，形成可执行结论，并只输出 JSON。",
        "schema": {
            "summary": "最终结论摘要",
            "final_conclusion": "完整最终结论",
            "stance": "approve | approve_with_conditions | reject | need_more_info",
            "risks": [{"name": "风险名称", "level": "low | medium | high"}],
            "open_questions": ["仍需确认的问题"],
            "actions": [],
        },
    },
    "generate_actions": {
        "system": "你是 Astra 的行动项规划器。请把结论、风险和待确认问题转成清晰行动项，并只输出 JSON。",
        "schema": {
            "summary": "行动计划摘要",
            "stance": "actions_generated",
            "risks": [],
            "open_questions": [],
            "actions": [
                {
                    "title": "行动项标题",
                    "owner": "负责人角色",
                    "priority": "high | medium | low",
                    "status": "todo",
                }
            ],
        },
    },
}


class LLMGateway:
    """Single-model gateway with stage-aware prompts and deterministic fallback."""

    async def complete_structured(
        self,
        *,
        role: AgentRole | None,
        stage: str,
        topic: str,
        project: Project,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        prompt_config = STAGE_PROMPTS.get(stage, STAGE_PROMPTS["independent_review"])
        if settings.llm_base_url and settings.llm_api_key:
            return await self._complete_remote(
                role=role,
                stage=stage,
                topic=topic,
                project=project,
                context=context,
                prompt_config=prompt_config,
            )
        return self._complete_local(role=role, stage=stage, topic=topic, project=project, context=context)

    async def _complete_remote(
        self,
        *,
        role: AgentRole | None,
        stage: str,
        topic: str,
        project: Project,
        context: dict[str, Any],
        prompt_config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        prompt_config = prompt_config or STAGE_PROMPTS.get(stage, STAGE_PROMPTS["independent_review"])
        role_name = role.name if role else "AI 主持人"
        role_code = role.code if role else "host"
        prompt = (
            f"角色：{role_name}\n"
            f"阶段：{stage}\n"
            f"项目：{project.name}\n"
            f"议题：{topic}\n"
            f"上下文 JSON：{json.dumps(context, ensure_ascii=False, default=str)}\n"
            f"输出 JSON schema：{json.dumps(prompt_config['schema'], ensure_ascii=False)}\n"
            "请严格返回一个 JSON object，不要使用 Markdown，不要补充 JSON 之外的文字。"
        )
        payload = {
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": prompt_config["system"]},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        headers = {"Authorization": f"Bearer {settings.llm_api_key}"}
        url = self._chat_completions_url(settings.llm_base_url)
        timeout = settings.llm_timeout_seconds

        max_retries = 2
        for attempt in range(max_retries + 1):
            t_start = time.perf_counter()
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(url, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                content = data["choices"][0]["message"]["content"]
                parsed = self._parse_json_content(content)
                elapsed_ms = (time.perf_counter() - t_start) * 1000
                logger.info(
                    "llm_call stage=%s role=%s status=success elapsed_ms=%.0f",
                    stage, role_code, elapsed_ms,
                )
                return self._normalize_output(parsed, stage=stage)
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                elapsed_ms = (time.perf_counter() - t_start) * 1000
                if attempt < max_retries:
                    logger.warning(
                        "llm_call stage=%s role=%s status=retry_%d elapsed_ms=%.0f error=%s",
                        stage, role_code, attempt + 1, elapsed_ms, exc,
                    )
                    await asyncio.sleep(1)
                    continue
                logger.error(
                    "llm_call stage=%s role=%s status=fallback elapsed_ms=%.0f error=%s",
                    stage, role_code, elapsed_ms, exc,
                )
                return self._complete_local(role=role, stage=stage, topic=topic, project=project, context=context)
            except httpx.HTTPStatusError as exc:
                elapsed_ms = (time.perf_counter() - t_start) * 1000
                status_code = exc.response.status_code
                # 4xx 客户端错误（鉴权失败/参数错误/模型不存在）不重试，直接抛出
                if 400 <= status_code < 500:
                    logger.error(
                        "llm_call stage=%s role=%s status=client_error http=%d elapsed_ms=%.0f",
                        stage, role_code, status_code, elapsed_ms,
                    )
                    raise
                # 5xx 服务端错误可重试
                if attempt < max_retries:
                    logger.warning(
                        "llm_call stage=%s role=%s status=retry_%d http=%d elapsed_ms=%.0f",
                        stage, role_code, attempt + 1, status_code, elapsed_ms,
                    )
                    await asyncio.sleep(1)
                    continue
                logger.error(
                    "llm_call stage=%s role=%s status=server_error http=%d elapsed_ms=%.0f",
                    stage, role_code, status_code, elapsed_ms,
                )
                return self._complete_local(role=role, stage=stage, topic=topic, project=project, context=context)
            except Exception as exc:
                elapsed_ms = (time.perf_counter() - t_start) * 1000
                logger.error(
                    "llm_call stage=%s role=%s status=error elapsed_ms=%.0f error=%s",
                    stage, role_code, elapsed_ms, exc,
                )
                # JSON 解析失败等，fallback 到本地
                return self._complete_local(role=role, stage=stage, topic=topic, project=project, context=context)
        # 不应到达这里
        return self._complete_local(role=role, stage=stage, topic=topic, project=project, context=context)

    def _complete_local(
        self,
        *,
        role: AgentRole | None,
        stage: str,
        topic: str,
        project: Project,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        role_code = role.code if role else "host"
        role_name = role.name if role else "AI 主持人"
        if stage == "clarify_topic":
            return {
                "summary": f"议题聚焦为：在 {project.name} 中评估「{topic}」是否满足自动化落地条件。",
                "stance": "needs_structured_review",
                "risks": project.risks[:2],
                "open_questions": ["自动结算的异常回退规则是否完整？", "审计记录是否满足财务复核要求？"],
                "actions": [],
            }
        if stage == "detect_conflict":
            return {
                **DEFAULT_OUTPUT,
                "summary": "已识别效率收益与风险控制之间的核心争议。",
                "stance": "conflicts_detected",
                "conflicts": [
                    {
                        "title": "效率收益与财务风控边界",
                        "supporting_view": "产品视角认为小额自动结算能显著缩短报销周期。",
                        "cautious_view": "测试和架构视角要求先补齐异常回退、审计和幂等控制。",
                        "judgement": "可以推进 MVP，但必须限制范围并满足前置控制条件。",
                    }
                ],
            }
        if stage == "debate":
            return {
                **DEFAULT_OUTPUT,
                "summary": "辩论结论：业务价值成立，但上线前必须完成异常回退、审计链路和灰度回滚设计。",
                "stance": "debate_summarized",
            }
        if stage == "judge_and_summarize":
            conclusion = (
                "建议以受限 MVP 推进小额发票自动结算：仅覆盖 200 元及以下、OCR 与验真通过、"
                "无异常命中且审计记录完整的单据。"
            )
            return {
                **DEFAULT_OUTPUT,
                "summary": conclusion,
                "final_conclusion": conclusion,
                "stance": "approve_with_conditions",
                "risks": [{"name": "异常场景覆盖不足会导致财务风险外溢", "level": "medium"}],
                "open_questions": ["灰度试点的回滚标准是什么？"],
            }
        if stage == "generate_actions":
            return {
                **DEFAULT_OUTPUT,
                "summary": "已生成围绕范围、架构控制和验收用例的行动项。",
                "stance": "actions_generated",
                "actions": [
                    {"title": "定义自动结算适用范围", "owner": "产品经理", "priority": "high", "status": "todo"},
                    {"title": "补充自动结算状态机和审计字段", "owner": "后端架构师", "priority": "high", "status": "todo"},
                    {"title": "制定异常场景验收用例", "owner": "测试工程师", "priority": "medium", "status": "todo"},
                ],
            }
        if role_code == "product_manager":
            return {
                "summary": "该议题具备明确体验价值，建议先限制金额、场景和异常回退范围，以 MVP 验证效率提升。",
                "stance": "support_with_scope_control",
                "risks": ["范围扩大后审批规则可能失控"],
                "open_questions": ["哪些发票类型应先排除？"],
                "actions": ["定义 MVP 自动结算适用范围"],
            }
        if role_code == "backend_architect":
            return {
                "summary": "技术上可行，但必须将 OCR、验真、幂等、风控和审计日志串成可追踪链路。",
                "stance": "support_after_controls",
                "risks": ["重复提交和接口超时会影响自动结算可靠性"],
                "open_questions": ["验真失败和支付失败的补偿策略是什么？"],
                "actions": ["补充自动结算状态机和审计字段"],
            }
        if role_code == "qa_engineer":
            return {
                "summary": "需要覆盖重复提交、OCR 误识别、验真超时、支付失败和人工回退等失败场景。",
                "stance": "cautious",
                "risks": ["边界场景不足会导致财务风险外溢"],
                "open_questions": ["灰度试点的回滚标准是什么？"],
                "actions": ["制定自动结算验收用例和回归清单"],
            }
        return {
            "summary": f"{role_name} 已完成 {stage} 阶段分析。",
            "stance": "neutral",
            "risks": [],
            "open_questions": [],
            "actions": [],
        }

    def _parse_json_content(self, content: str) -> dict[str, Any]:
        text = content.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        parsed = json.loads(text)
        if not isinstance(parsed, dict):
            raise ValueError("LLM response must be a JSON object")
        return parsed

    def _normalize_output(self, data: dict[str, Any], *, stage: str) -> dict[str, Any]:
        output = dict(DEFAULT_OUTPUT)
        output["summary"] = data["summary"] if isinstance(data.get("summary"), str) else ""
        output["stance"] = data["stance"] if isinstance(data.get("stance"), str) else "neutral"
        output["risks"] = data["risks"] if isinstance(data.get("risks"), list) else []
        output["open_questions"] = data["open_questions"] if isinstance(data.get("open_questions"), list) else []
        output["actions"] = data["actions"] if isinstance(data.get("actions"), list) else []

        if stage == "detect_conflict":
            output["conflicts"] = data["conflicts"] if isinstance(data.get("conflicts"), list) else []
        if stage == "judge_and_summarize":
            final_conclusion = data.get("final_conclusion")
            output["final_conclusion"] = final_conclusion if isinstance(final_conclusion, str) else output["summary"]
        return output

    def _chat_completions_url(self, base_url: str | None) -> str:
        if not base_url:
            raise ValueError("LLM base URL is required")
        url = base_url.rstrip("/")
        # DeepSeek/OpenAI SDK 常配置 base_url；当前 Gateway 直接 POST，因此这里补齐 endpoint。
        if url.endswith("/chat/completions"):
            return url
        if url.endswith("/v1"):
            return f"{url}/chat/completions"
        return f"{url}/chat/completions"
