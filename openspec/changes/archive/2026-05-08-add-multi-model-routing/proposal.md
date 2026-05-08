## Why

当前 LLM Gateway 全局使用单一模型（`ASTRA_LLM_MODEL`），所有研讨阶段和 Agent 角色共享同一模型。辩论阶段需要更强的推理能力，独立评审阶段需要更快的响应速度，单模型方案无法按需调配。本次引入多模型路由——管理员预定义模型花名册和默认路由规则，用户可在发起研讨时按阶段覆盖，Gateway 按优先级自动选择模型。

## What Changes

- **模型花名册**：新增 `ASTRA_LLM_MODEL_PROFILES` 环境变量（JSON），定义可用模型及其连接信息（model、base_url、api_key），向后兼容现有 `ASTRA_LLM_MODEL`
- **Stage/Role 路由**：新增 `ASTRA_LLM_STAGE_ROUTING` 和 `ASTRA_LLM_ROLE_ROUTING` 配置，按阶段或角色指定默认模型花名
- **Session 级覆盖**：`DiscussionSession` 新增 `model_overrides` 字段，存储用户发起研讨时对特定阶段的模型选择
- **模型解析优先级**：LLMGateway 按 `Session Override → Role Routing → Stage Routing → Default Profile → settings.llm_model` 解析
- **新增 /models 端点**：`GET /models/profiles`（返回花名册，脱敏）、`POST /models/test`（测试模型连通性）
- **前端模型选择面板**：StartSession 页展示每个阶段的当前模型，用户可从花名册中选择覆盖
- **前端模型标签**：Workspace 页 Agent 发言旁显示实际使用的模型名称

## Capabilities

### New Capabilities

- `model-routing`: 多模型花名册管理、按阶段/角色路由、Session 级覆盖、模型连通性测试

### Modified Capabilities

- `backend-agent-session`: LLM Gateway 从单模型升级为多模型路由，Gateway 行为规格更新

## Impact

- **后端修改文件**: `config.py`（+3 配置项）、`llm_gateway.py`（resolve_model + 按 profile 调用）、`models.py`（DiscussionSession +model_overrides）、`schemas.py`（ModelProfile/ModelTestResult schema）、`main.py`（/models/* 端点 + Session 创建存 model_overrides）、`orchestrator.py`（传递 model_overrides）
- **前端新增文件**: `ModelSelector.tsx` 组件
- **前端修改文件**: `types.ts`（ModelProfile 类型）、`client.ts`（/models API 方法）、`StartSession.tsx`（模型选择面板）、`StartSessionForm.tsx`（表单含 model_overrides）、`Workspace.tsx`（显示模型标签）
- **测试**: `test_llm_gateway.py`（多模型路由优先级）、`test_models_api.py`（/models 端点）、前端 client 测试
- **部署**: 生产环境新增 `ASTRA_LLM_MODEL_PROFILES` 配置；现有 `ASTRA_LLM_MODEL` 继续作为默认值
