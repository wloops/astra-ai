## Why

当前每次研讨的结论、争议、决策都是高质量的结构化知识，但 Session 完成后即沉入数据库深处不再被使用。Host Agent 虽然能自主主持研讨，却没有"记忆"——无法参考历史决策、无法发现相似案例、每次研讨都是零起点。产品需要将研讨产出转化为可持续积累的机构知识，使 Host Agent 和用户都能检索、引用、发现历史智慧。

## What Changes

- **自动入库**：Session 完成时自动从 SessionResult 提取内容创建 KnowledgeEntry，拼接全文索引文本，通过现有 LLM API 生成 embedding 向量存入同一条记录
- **语义搜索**：`GET /knowledge/search?q=&project_id=&scenario=` 端点，Python cosine_similarity 计算查询 embedding 与所有条目的相似度排序，返回分页结果
- **Host Agent SEARCH_KNOWLEDGE**：新增决策类型，Host Agent 可在任何决策点发起知识检索，结果注入下一轮决策上下文。写入 `knowledge_referenced` 事件推送给前端
- **StartSession 相似案例**：用户输入议题后自动计算与历史条目的相似度，展示 top 3 相关讨论作为参考
- **知识图谱**：`GET /knowledge/graph` 端点返回节点（Session）和边（项目归属 + 语义相似度 > 阈值 + 显式引用），前端用轻量力导向图渲染
- **前端知识库页面**（`/knowledge-base`）：双视图——搜索列表视图（关键词/语义搜索 + 筛选）和知识图谱视图（力导向图，可缩放拖拽）
- **Workspace 活跃工具面板真实化**：右侧面板的"知识库检索"和"历史案例检索"从假数据切换为实时状态
- **KnowledgeEntry 模型**：独立于 SessionResult，支持手动添加笔记和标签，Session 删除时知识条目可选择保留

## Capabilities

### New Capabilities

- `knowledge-base`: 知识条目自动入库、embedding 语义搜索、知识图谱可视化、Host Agent 检索集成

### Modified Capabilities

- `agentic-orchestration`: Host Agent 新增 SEARCH_KNOWLEDGE 决策类型，支持在研讨中途检索历史知识
- `web-demo-session-flow`: Workspace 活跃工具面板真实化 + StartSession 相似案例提示

## Impact

- **后端新增文件**: `knowledge.py`（入库、搜索、图谱、embedding 生成逻辑）、`tests/test_knowledge.py`
- **后端修改文件**: `models.py`（KnowledgeEntry 表）、`schemas.py`（KnowledgeEntry Schema）、`main.py`（/knowledge/* 端点）、`orchestrator.py`（SEARCH_KNOWLEDGE 决策处理 + 入库触发）、`llm_gateway.py`（embedding API 调用方法）
- **前端新增文件**: `pages/KnowledgeBase.tsx`、`components/knowledge/KnowledgeSearch.tsx`、`components/knowledge/KnowledgeCard.tsx`、`components/knowledge/KnowledgeGraph.tsx`、`components/knowledge/SimilarCases.tsx`
- **前端修改文件**: `App.tsx`（/knowledge-base 路由）、`Navbar.tsx`（知识库入口）、`Workspace.tsx`（工具面板真实化）、`StartSession.tsx`（相似案例）、`types.ts`（KnowledgeEntry 类型）、`client.ts`（knowledge API 方法）
- **新增依赖**: 无新后端依赖（embedding 复用现有 httpx + LLM API）；前端新增 `vis-network` 或 `d3-force`（图谱可视化，~50KB gzipped）
- **部署**: 首次启动时为已有 SessionResult 批量生成 embedding（可异步）；生产环境需确保 LLM API 支持 `/embeddings` endpoint
