## Context

当前 LLMGateway 在 `complete_structured()` 中硬编码使用 `settings.llm_model`，所有 7 个 LLM 阶段和 4 个角色共用同一模型。Gateway 已有清晰的抽象边界——`complete_structured(role, stage, topic, project, context)`——扩展模型选择逻辑不影响调用方（orchestrator）。

## Goals / Non-Goals

**Goals:**
- 管理员通过环境变量定义模型花名册（profile），每个 profile 含 model/base_url/api_key
- 管理员配置默认 stage→profile 和 role→profile 路由
- 用户发起研讨时可查看当前路由并选择覆盖特定阶段的模型
- Gateway 按 Session Override > Role Routing > Stage Routing > Default Profile > `settings.llm_model` 解析
- 新增 `/models/profiles`（脱敏返回花名册）和 `/models/test`（连通性测试）端点
- 向后兼容：未配置任何 profile 时行为与当前单模型完全一致

**Non-Goals:**
- 不做模型成本追踪 / token 统计
- 不做模型性能对比 / A/B 测试
- 不做模型 fallback 链（主模型失败自动切换备用模型）
- 不做前端直接配置模型（用户只能选花名，不能填 API Key）
- 不做按用户角色限制模型选择

## Decisions

### 1. 配置结构：JSON profile 字典

**选择**：
```json
ASTRA_LLM_MODEL_PROFILES='{
  "default": {"model": "gpt-4o-mini"},
  "strong": {"model": "gpt-4o", "base_url": "https://api.openai.com/v1"},
  "deepseek": {"model": "deepseek-chat", "base_url": "https://api.deepseek.com/v1", "api_key": "sk-xxx"}
}'
ASTRA_LLM_STAGE_ROUTING='{"debate":"strong","judge_and_summarize":"strong","independent_review":"default"}'
ASTRA_LLM_ROLE_ROUTING='{}'
```

每个 profile 的 `base_url` 和 `api_key` 为可选——未指定时继承全局 `llm_base_url` / `llm_api_key`。

**备选**：每个模型独立环境变量（如 `ASTRA_LLM_STRONG_MODEL`）

**理由**：JSON 字典方案可扩展性强，增加新模型只需在 profiles 中加一条；独立的 stage/role routing 配置可灵活映射而不影响 profile 定义。

### 2. 模型解析链

```
resolve_model(stage, role, session_model_overrides) → ModelProfile:

  def resolve_model(stage, role, overrides):
      # 1. Session 级覆盖（用户发起研讨时指定）
      if overrides and stage in overrides:
          profile_name = overrides[stage]
          return profiles[profile_name]
      
      # 2. Role 路由（管理员配置的默认角色→模型映射）
      if role and role.code in role_routing:
          return profiles[role_routing[role.code]]
      
      # 3. Stage 路由（管理员配置的默认阶段→模型映射）
      if stage in stage_routing:
          return profiles[stage_routing[stage]]
      
      # 4. Default profile
      if "default" in profiles:
          return profiles["default"]
      
      # 5. 向后兼容：使用现有单模型配置
      return ModelProfile(
          model=settings.llm_model,
          base_url=settings.llm_base_url,
          api_key=settings.llm_api_key,
      )
```

### 3. Gateway 改动策略

**选择**：在 `complete_structured()` 入口调用 `resolve_model()`，选出的 profile 传给 `_complete_remote()`。

```python
async def complete_structured(self, *, role, stage, topic, project, context, model_overrides=None):
    prompt_config = STAGE_PROMPTS.get(stage, ...)
    profile = resolve_model(stage, role, model_overrides)
    
    if profile.base_url and profile.api_key:
        return await self._complete_remote(
            role=role, stage=stage, ...,
            model=profile.model,
            base_url=profile.base_url,
            api_key=profile.api_key,
        )
    return self._complete_local(...)
```

Gateway 本身不解析具体用哪个 profile——`resolve_model()` 作为模块级函数，可被 Gateway 和 `/models/test` 端点复用。

### 4. Session 级覆盖存储

**选择**：`DiscussionSession.model_overrides: dict[str, str]` — `{"debate": "claude-opus"}`

仅在 Session 创建时写入，后续不可通过 API 修改（研讨一旦开始，模型配置锁定）。前端发起研讨时从 `/models/profiles` 获取可用花名并展示选择面板。

### 5. /models/profiles 脱敏

返回 profile 列表时移除 `api_key` 字段，仅返回 `name`、`model`、`base_url`（脱敏显示域名）。前端不需要也看不到 API Key。

### 6. /models/test 端点

接受 `{"profile_name": "strong"}`，向该 profile 的 API 发一个最小请求（如 `{"model": "...", "messages": [{"role": "user", "content": "ping"}], "max_tokens": 1}`），检查响应状态。用于管理员验证新模型配置是否正确。

### 7. 前端模型选择面板

StartSession 表单中新增"模型配置"折叠区域，默认折叠。展开后以表格形式展示：

| 阶段 | 当前模型 | 覆盖 |
|------|---------|------|
| 澄清议题 | gpt-4o-mini (default) | [下拉] |
| 独立评审 | gpt-4o-mini (default) | [下拉] |
| 识别争议 | gpt-4o-mini (default) | [下拉] |
| 交叉辩论 | gpt-4o (strong) | [下拉] |
| 裁决总结 | gpt-4o (strong) | [下拉] |
| 生成行动 | gpt-4o-mini (default) | [下拉] |

下拉选项来自 `/models/profiles` 返回的花名册（默认项 + 花名列表）。选择覆盖后，对应阶段使用所选模型。

### 8. Workspace 模型标签

Agent 发言事件（`agent_message`）的 payload 中新增 `model_used` 字段，前端在发言卡片头部展示模型名称标签。

## Risks / Trade-offs

- **[不同模型 provider 的 API 兼容性]**：假设所有模型都是 OpenAI-compatible Chat Completions API。→ 设计上 profile 中声明 model/base_url，Gateway 统一用 OpenAI 格式调用。若某模型不兼容，标记为不可用并在 `/models/test` 中暴露。
- **[模型覆盖锁定后无法中途更改]**：Session 开始后 `model_overrides` 不可改。→ 这是有意设计。若需要，取消 Session 重新发起即可。
- **[profile 配置复杂度]**：JSON 环境变量对运维要求较高。→ 提供清晰的文档示例；未配置时完全向后兼容，零学习成本起步。
- **[api_key 在环境变量中以 JSON 明文存储]**：与现有 `ASTRA_LLM_API_KEY` 安全等级一致。→ 不在前端展示，`/models/profiles` 脱敏返回。

## Migration Plan

1. 新增 `config.py` 配置项（默认空字符串，向后兼容）
2. 新增 `resolve_model()` 函数
3. 重构 `LLMGateway.complete_structured()` 集成模型选择
4. 新增 `/models/*` 端点
5. 新增 `DiscussionSession.model_overrides` 字段（数据库自动迁移）
6. 前端 ModelSelector 组件 + StartSession 集成
7. 前端 Workspace 显示模型标签
8. 测试覆盖

回滚策略：将 `llm_model_profiles` / `llm_stage_routing` / `llm_role_routing` 置空即可回退到单模型行为。Gateway 代码无需回滚（空配置走默认路径）。

## Open Questions

无。所有设计决策已在探索阶段对齐。
