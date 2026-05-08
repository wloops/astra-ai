from sqlmodel import Session, select

from astra_api.auth import ADMIN_USERNAME, DISABLED_PASSWORD, admin_login_password, hash_password, verify_password
from astra_api.models import AgentRole, DiscussionSession, Project, ScenarioTemplate, Task, TaskPriority, TaskStatus, User


DEFAULT_ROLES = [
    AgentRole(
        name="AI 主持人",
        code="host",
        description="负责阶段推进、分歧归纳和结论收敛。",
        responsibilities=["理解议题目标", "调度专家角色", "推动讨论收敛", "组织结构化输出"],
        focus_areas=["流程控制", "争议识别", "结论质量"],
        tools=["project_context"],
        output_style="清晰、克制、面向决策",
        is_default=True,
        can_debate=True,
        can_use_tools=True,
    ),
    AgentRole(
        name="产品经理",
        code="product_manager",
        description="评估业务价值、用户体验和需求边界。",
        responsibilities=["判断业务价值", "识别成功标准", "评估范围取舍"],
        focus_areas=["用户价值", "需求边界", "MVP 可行性"],
        output_style="聚焦取舍和可执行结论",
        is_default=True,
        can_debate=True,
    ),
    AgentRole(
        name="后端架构师",
        code="backend_architect",
        description="评估技术可行性、系统边界和集成风险。",
        responsibilities=["评估技术方案", "识别数据和接口风险", "提出架构建议"],
        focus_areas=["接口边界", "数据一致性", "性能与可靠性"],
        tools=["tool_registry"],
        output_style="技术判断明确，说明前置条件",
        is_default=True,
        can_debate=True,
        can_use_tools=True,
    ),
    AgentRole(
        name="测试工程师",
        code="qa_engineer",
        description="识别失败场景、验收标准和回归风险。",
        responsibilities=["设计验收标准", "识别失败场景", "明确质量门槛"],
        focus_areas=["边界条件", "异常流程", "回归风险"],
        output_style="列出可验证标准和风险清单",
        is_default=True,
        can_debate=True,
    ),
]

DEFAULT_SCENARIOS = [
    ScenarioTemplate(
        name="需求澄清",
        code="requirement_clarification",
        description="澄清复杂议题，识别决策条件、风险和行动项。",
        stages=[
            "init_session",
            "load_context",
            "clarify_topic",
            "independent_review",
            "detect_conflict",
            "debate",
            "judge_and_summarize",
            "generate_actions",
            "finalize_minutes",
        ],
        host_hints=(
            "Use the suggested stages as guidance. If independent review shows no major conflict, "
            "skip debate and move to judgement. Pull in extra roles only when a missing expertise "
            "would change the decision."
        ),
        parallel_groups=[["product_manager", "backend_architect", "qa_engineer"]],
        default_role_codes=["host", "product_manager", "backend_architect", "qa_engineer"],
        output_schema=[
            "final_conclusion",
            "key_conflicts",
            "role_summaries",
            "risks",
            "open_questions",
            "actions",
            "actual_flow",
            "skipped_stages",
            "added_stages",
            "markdown_minutes",
        ],
        recommended_tools=["project_context", "tool_registry"],
    ),
    ScenarioTemplate(
        name="架构评审",
        code="architecture_review",
        description="围绕技术方案进行多角色评审，输出风险、前置条件和建议。",
        stages=[
            "init_session",
            "load_context",
            "clarify_topic",
            "independent_review",
            "detect_conflict",
            "debate",
            "judge_and_summarize",
            "generate_actions",
            "finalize_minutes",
        ],
        host_hints=(
            "Prioritize architecture risk, integration boundaries, and validation evidence. "
            "Use debate only when role outputs expose a material technical trade-off."
        ),
        parallel_groups=[["backend_architect", "product_manager", "qa_engineer"]],
        default_role_codes=["host", "backend_architect", "product_manager", "qa_engineer"],
        output_schema=[
            "final_conclusion",
            "key_conflicts",
            "role_summaries",
            "risks",
            "open_questions",
            "actions",
            "actual_flow",
            "skipped_stages",
            "added_stages",
            "markdown_minutes",
        ],
        recommended_tools=["project_context"],
    ),
]

DEFAULT_PROJECT = Project(
    name="企业极速差旅报销系统",
    description="用于演示智能研讨闭环的示例项目。",
    goal="缩短小额发票报销周期，在可控风险下提升员工体验。",
    background="员工提交 200 元及以下的打车或餐饮发票时，希望在 OCR 识别与验真通过后跳过人工审批，直接自动结算。",
    architecture="已有 OCR、发票验真、报销单和支付结算模块，审批流仍以人工为主。",
    progress="已完成 OCR 与验真接口调研，尚未确定自动结算风控边界。",
    risks=["发票重复提交", "异常商户识别不足", "财务审计追踪不完整"],
    constraints=["单张发票金额不超过 200 元", "必须保留审计记录", "异常单据必须回退人工审批"],
    completeness=82,
    tags=["报销", "自动化", "MVP"],
)


def _default_tasks(project_id: str, user_id: str) -> list[Task]:
    return [
        Task(
            project_id=project_id,
            user_id=user_id,
            title="确认自动结算风控阈值",
            description="把研讨结论中的金额、商户和重复提交规则整理为可配置阈值。",
            status=TaskStatus.TODO,
            priority=TaskPriority.HIGH,
            assignee_role_code="product_manager",
            tags=["seed", "risk-control"],
        ),
        Task(
            project_id=project_id,
            user_id=user_id,
            title="补充审计记录字段",
            description="为自动结算链路保留必要审计字段，支撑财务回溯。",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.MEDIUM,
            assignee_role_code="backend_architect",
            tags=["seed", "audit"],
        ),
    ]


def seed_defaults(session: Session) -> None:
    admin = _ensure_admin_user(session)
    if session.exec(select(AgentRole)).first() is None:
        session.add_all(DEFAULT_ROLES)
    if session.exec(select(ScenarioTemplate)).first() is None:
        session.add_all(DEFAULT_SCENARIOS)
    if session.exec(select(Project)).first() is None:
        DEFAULT_PROJECT.user_id = admin.id
        session.add(DEFAULT_PROJECT)
        session.commit()
    backfill_user_id(session, admin.id)
    project = session.exec(select(Project)).first()
    if project is not None and session.exec(select(Task)).first() is None:
        session.add_all(_default_tasks(project.id, admin.id))
    session.commit()


def _ensure_admin_user(session: Session) -> User:
    user = session.exec(select(User).where(User.username == ADMIN_USERNAME)).first()
    password = admin_login_password() or DISABLED_PASSWORD
    if user is not None:
        if admin_login_password() and not verify_password(password, user.hashed_password):
            # 显式配置管理员密码时同步哈希，避免历史默认密码继续生效。
            user.hashed_password = hash_password(password)
            session.add(user)
            session.commit()
            session.refresh(user)
        return user
    user = User(username=ADMIN_USERNAME, hashed_password=hash_password(password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def backfill_user_id(session: Session, user_id: str) -> None:
    for model in (Project, DiscussionSession, Task):
        for item in session.exec(select(model).where(model.user_id == None)).all():  # noqa: E711
            # 历史数据归属 admin，保证升级后仍能通过 API Key 或 admin 账号访问。
            item.user_id = user_id
            session.add(item)
    session.commit()
