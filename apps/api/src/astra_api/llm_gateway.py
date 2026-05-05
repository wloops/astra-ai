from typing import Any

import httpx

from astra_api.config import settings
from astra_api.models import AgentRole, Project


class LLMGateway:
    """Single-model gateway with a deterministic local fallback for MVP demos."""

    async def complete_structured(
        self,
        *,
        role: AgentRole | None,
        stage: str,
        topic: str,
        project: Project,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        if settings.llm_base_url and settings.llm_api_key:
            return await self._complete_remote(role=role, stage=stage, topic=topic, project=project, context=context)
        return self._complete_local(role=role, stage=stage, topic=topic, project=project, context=context)

    async def _complete_remote(
        self,
        *,
        role: AgentRole | None,
        stage: str,
        topic: str,
        project: Project,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        role_name = role.name if role else "AI 主持人"
        prompt = (
            f"你是 Astra 的{role_name}。请围绕阶段 {stage} 输出简洁 JSON。\n"
            f"项目：{project.name}\n议题：{topic}\n上下文：{context}\n"
            "JSON 字段：summary, stance, risks, open_questions, actions。"
        )
        payload = {
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": "你输出严格 JSON，不要输出 Markdown。"},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        headers = {"Authorization": f"Bearer {settings.llm_api_key}"}
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(settings.llm_base_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        content = data["choices"][0]["message"]["content"]
        return {"summary": content, "stance": "remote_model", "risks": [], "open_questions": [], "actions": []}

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
