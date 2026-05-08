## 1. 数据模型（后端）

- [x] 1.1 `models.py` 新增 `KnowledgeEntry` SQLModel 表（含 `search_text` + `embedding` BLOB 列）
- [x] 1.2 `schemas.py` 新增 `KnowledgeEntryCreate`、`KnowledgeEntryRead`、`KnowledgeSearchResult`、`KnowledgeGraphData` schema

## 2. Embedding 与检索引擎（后端）

- [x] 2.1 新建 `knowledge.py`：`generate_embedding(text) -> list[float]`（调用 LLM API `/embeddings` endpoint）
- [x] 2.2 `knowledge.py`：`create_entry(session_id)` 从 SessionResult 提取数据创建 KnowledgeEntry
- [x] 2.3 `knowledge.py`：`search_entries(query, user_id, project_id, scenario, limit)`：embedding 语义搜索 + LIKE fallback
- [x] 2.4 `knowledge.py`：`get_similar_entries(topic, user_id, limit)`：按 topic 找相似条目
- [x] 2.5 `knowledge.py`：`get_graph_data(user_id, project_id, limit)`：构建节点和边
- [x] 2.6 `knowledge.py`：`backfill_missing_entries()`：启动时回填历史数据

## 3. `/knowledge` API 端点（后端）

- [x] 3.1 `main.py` 新增 `GET /knowledge/search?q=&project_id=&scenario=&offset=&limit=`
- [x] 3.2 `main.py` 新增 `GET /knowledge/similar?topic=&limit=3`
- [x] 3.3 `main.py` 新增 `GET /knowledge/entries?offset=&limit=&project_id=&scenario=`
- [x] 3.4 `main.py` 新增 `GET /knowledge/graph?project_id=&limit=50`
- [x] 3.5 `main.py` 新增 `GET /knowledge/entries/{id}` 单条目详情

## 4. Host Agent 集成（后端）

- [x] 4.1 `orchestrator.py` 新增 SEARCH_KNOWLEDGE 决策处理：调用 `knowledge.search_entries()`，注入上下文
- [x] 4.2 `orchestrator.py` 写入 `knowledge_referenced` 事件（含匹配条目摘要，脱敏后推送）
- [x] 4.3 `orchestrator.py` `finalize_minutes` 后触发 `knowledge.create_entry(session_id)`
- [x] 4.4 `orchestrator.py` Host Agent 决策 prompt 新增 SEARCH_KNOWLEDGE 能力说明

## 5. 启动回填（后端）

- [x] 5.1 `db.py` 或 `main.py` lifespan 中检测缺失条目并触发 `backfill_missing_entries()`
- [x] 5.2 回填以 background task 异步执行，不阻塞 API 启动

## 6. 前端类型与 API Client

- [x] 6.1 `types.ts` 新增 `KnowledgeEntry`、`KnowledgeSearchResult`、`KnowledgeGraphData`、`KnowledgeReference` 类型
- [x] 6.2 `client.ts` 新增 `searchKnowledge`、`getSimilarEntries`、`getKnowledgeEntries`、`getKnowledgeGraph`、`getKnowledgeEntry` 方法

## 7. 前端知识库页面

- [x] 7.1 新建 `pages/KnowledgeBase.tsx`：双视图切换（搜索列表 + 图谱）
- [x] 7.2 新建 `components/knowledge/KnowledgeSearch.tsx`：搜索框 + 项目/场景筛选器
- [x] 7.3 新建 `components/knowledge/KnowledgeCard.tsx`：知识卡片（标题、结论摘要、项目、时间、相似度）
- [x] 7.4 新建 `components/knowledge/KnowledgeGraph.tsx`：vis-network 力导向图渲染，节点点击弹出侧边面板
- [x] 7.5 `App.tsx` 新增 `/knowledge-base` 路由
- [x] 7.6 `Navbar.tsx` 新增“知识库”导航入口
- [x] 7.7 `client.ts` knowledge API 方法加上防抖和错误处理

## 8. 前端现有页面集成

- [x] 8.1 新建 `components/knowledge/SimilarCases.tsx`：相似案例卡片列表
- [x] 8.2 `StartSession.tsx` 议题输入框防抖触发 `/knowledge/similar`，展示 SimilarCases
- [x] 8.3 `Workspace.tsx` 右侧面板“历史决策相似案例检索”从假数据切换为 `knowledge_referenced` 事件驱动
- [x] 8.4 `Workspace.tsx` 接收 `knowledge_referenced` 事件时更新面板状态

## 9. 测试

- [x] 9.1 `tests/test_knowledge.py`：入库（含幂等）、embedding 生成、语义搜索、相似案例
- [x] 9.2 `tests/test_knowledge.py`：embedding 失败时 LIKE fallback
- [x] 9.3 `tests/test_knowledge.py`：图谱数据（节点数、边类型、权重）
- [x] 9.4 `tests/test_knowledge.py`：数据隔离（用户 A 搜不到用户 B 的条目）
- [x] 9.5 `tests/test_orchestrator.py` 更新：SEARCH_KNOWLEDGE 决策 + `knowledge_referenced` 事件
- [x] 9.6 `tests/test_orchestrator.py`：入库触发（Session 完成后自动创建 KnowledgeEntry）
- [x] 9.7 前端 `KnowledgeBase` 页面渲染测试
