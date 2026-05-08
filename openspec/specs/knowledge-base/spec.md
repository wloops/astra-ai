# knowledge-base Specification

## Purpose

知识沉淀系统——Session 完成自动入库、embedding 语义搜索、知识图谱可视化、Host Agent 检索集成。

## ADDED Requirements

### Requirement: Session 自动入库

系统 SHALL 在 Session 完成时自动从 SessionResult 创建 KnowledgeEntry，包含全量文本和 embedding 向量。

#### Scenario: 成功入库
- **WHEN** Session status 变为 `completed` 且 SessionResult 已生成
- **THEN** 系统 SHALL 创建 KnowledgeEntry 记录
- **AND** SHALL 提取 topic、conclusion、key_conflicts、role_summaries、risks、actions
- **AND** SHALL 拼接 search_text（topic + conclusion + 所有结构化字段的文本表示）
- **AND** SHALL 调用 LLM API `/embeddings` endpoint 生成 embedding 向量
- **AND** SHALL 将 embedding 序列化为 BLOB 存入数据库

#### Scenario: 幂等入库
- **WHEN** 同一 Session 已完成入库
- **THEN** 再次触发时 SHALL 更新已有 KnowledgeEntry（而非创建重复记录）

#### Scenario: embedding 生成失败降级
- **WHEN** LLM API 的 embedding endpoint 不可用
- **THEN** 系统 SHALL 仍然创建 KnowledgeEntry（embedding 字段为 NULL）
- **AND** 该条目 SHALL 可通过 search_text 的 LIKE 关键词搜索被检索到

### Requirement: 语义搜索

系统 SHALL 提供语义搜索端点，通过 embedding 相似度匹配返回最相关的知识条目。

#### Scenario: 语义搜索
- **WHEN** 客户端 GET `/knowledge/search?q=微服务边界划分`
- **THEN** 系统 SHALL 对查询文本调用 embedding API 生成向量
- **AND** SHALL 计算与用户所有 KnowledgeEntry 的 cosine_similarity
- **AND** SHALL 按相似度降序返回分页结果（每项含相似度分数）
- **AND** SHALL 不返回其他用户的条目（数据隔离）

#### Scenario: 搜索结果关联原始 Session
- **WHEN** 搜索返回 KnowledgeEntry
- **THEN** 每个条目 SHALL 包含 `source_session_id`，前端可跳转到对应 SessionResult

#### Scenario: embedding 不可用时关键词搜索
- **WHEN** embedding API 不可用
- **THEN** 系统 SHALL fallback 到 search_text 列的 SQL LIKE 搜索
- **AND** SHALL 返回匹配结果（不包含相似度分数）

### Requirement: 相似案例查询

系统 SHALL 提供端点根据议题文本查找语义最相似的历史知识条目。

#### Scenario: 发起研讨前查相似案例
- **WHEN** 客户端 GET `/knowledge/similar?topic=微服务拆分策略&limit=3`
- **THEN** 系统 SHALL 对 topic 生成 embedding
- **AND** SHALL 返回相似度最高的 3 个条目

#### Scenario: 无相似案例
- **WHEN** 知识库为空或无相似度超过阈值（0.5）的条目
- **THEN** 系统 SHALL 返回空列表

### Requirement: 知识图谱数据

系统 SHALL 提供知识图谱端点，返回节点（知识条目）和边（关系连接）。

#### Scenario: 获取图谱数据
- **WHEN** 客户端 GET `/knowledge/graph?limit=50`
- **THEN** 系统 SHALL 返回 nodes 数组（id、topic、project、scenario、reference_count）
- **AND** SHALL 返回 edges 数组（source、target、type、weight）
- **AND** edges SHALL 包含三种关系：SAME_PROJECT（同项目）、SEMANTIC_SIMILAR（cosine > 0.75）、EXPLICIT_REFERENCE（Host Agent 引用）

#### Scenario: 按项目过滤图谱
- **WHEN** 客户端 GET `/knowledge/graph?project_id=<id>`
- **THEN** 系统 SHALL 仅返回指定项目的节点及相关边

### Requirement: 知识浏览与筛选

系统 SHALL 提供知识条目的分页浏览和按项目/场景筛选。

#### Scenario: 浏览知识条目
- **WHEN** 客户端 GET `/knowledge/entries?offset=0&limit=20`
- **THEN** 系统 SHALL 返回分页条目列表，按 created_at 降序

#### Scenario: 按项目筛选
- **WHEN** 客户端 GET `/knowledge/entries?project_id=<id>`
- **THEN** 系统 SHALL 仅返回该项目的条目

#### Scenario: 按场景筛选
- **WHEN** 客户端 GET `/knowledge/entries?scenario=<code>`
- **THEN** 系统 SHALL 仅返回该场景的条目

### Requirement: 历史数据回填

系统 SHALL 在启动时检测已有 SessionResult 是否缺少 KnowledgeEntry，自动补建。

#### Scenario: 首次升级回填
- **WHEN** 后端启动且存在已完成的 Session 无对应 KnowledgeEntry
- **THEN** 系统 SHALL 通过后台任务逐条创建 KnowledgeEntry 并生成 embedding
- **AND** SHALL 不阻塞 API 正常服务

#### Scenario: 后续启动跳过
- **WHEN** 所有已完成 Session 均有对应 KnowledgeEntry
- **THEN** 系统 SHALL 不执行回填

### Requirement: 前端知识库页面

前端 SHALL 提供 `/knowledge-base` 页面，支持搜索视图和图谱视图。

#### Scenario: 搜索列表视图
- **WHEN** 用户访问知识库页面
- **THEN** 默认展示搜索列表视图
- **AND** SHALL 包含搜索框（关键词/语义）、项目筛选、场景筛选
- **AND** SHALL 以卡片列表展示 KnowledgeEntry（标题、结论摘要、项目、时间、相似度）

#### Scenario: 语义搜索交互
- **WHEN** 用户在搜索框中输入查询并按回车
- **THEN** 前端 SHALL 调用 `/knowledge/search?q=<query>`
- **AND** SHALL 展示搜索结果，每项含相似度分数

#### Scenario: 图谱视图
- **WHEN** 用户切换到图谱视图
- **THEN** 前端 SHALL 调用 `/knowledge/graph`
- **AND** SHALL 以力导向图渲染节点和边
- **AND** 节点 SHALL 可点击弹出侧边面板展示详情
- **AND** 图谱 SHALL 支持缩放和拖拽

#### Scenario: 图谱视图按项目筛选
- **WHEN** 用户在图谱视图中选择特定项目
- **THEN** 图谱 SHALL 仅展示该项目节点和关联边

### Requirement: 前端相似案例提示

前端 StartSession 页面 SHALL 在用户输入议题后展示相似历史讨论。

#### Scenario: 输入议题后触发
- **WHEN** 用户在 StartSession 的议题输入框中输入超过 10 个字符
- **THEN** 前端 SHALL 防抖（500ms）后调用 `/knowledge/similar?topic=<输入文本>&limit=3`
- **AND** SHALL 在表单下方展示相似案例卡片（标题、结论摘要、时间、相似度）

#### Scenario: 无相似案例
- **WHEN** 知识库为空或无匹配
- **THEN** SHALL 不展示相似案例区域（不干扰用户）

### Requirement: 前端 Workspace 知识面板真实化

前端 Workspace 右侧"活跃进程与工具"面板 SHALL 展示真实的知识库检索状态。

#### Scenario: 展示知识检索状态
- **WHEN** Host Agent 执行 SEARCH_KNOWLEDGE 决策
- **THEN** 面板 SHALL 展示检索状态（"检索中..." → "找到 N 个案例"）
- **AND** 收到的案例 SHALL 以可点击列表展示

#### Scenario: 未检索时展示占位
- **WHEN** Host Agent 未发起知识检索
- **THEN** 面板 SHALL 展示"等待主持人决策..."状态
