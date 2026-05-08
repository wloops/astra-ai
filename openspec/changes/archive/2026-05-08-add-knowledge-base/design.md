## Context

当前 SessionResult 表存储了结构化的研讨产出（final_conclusion、key_conflicts、role_summaries、risks、actions），但只在结果页展示一次。Workspace.tsx 右侧面板有"合规政策检索"和"历史决策相似案例检索"的 UI 占位，始终显示假数据。LLM Gateway 已有 OpenAI 兼容的 HTTP 调用能力——同一个 API 的 `/embeddings` endpoint 可直接复用。

## Goals / Non-Goals

**Goals:**
- Session 完成时自动创建 KnowledgeEntry，包含全量文本索引和 embedding 向量
- 语义搜索：用现有 LLM API 生成查询 embedding，Python 内存 cosine_similarity 排序
- Host Agent 新增 SEARCH_KNOWLEDGE 决策类型，在研讨中途检索知识库
- StartSession 页面展示 top 3 相似历史讨论
- 知识图谱：节点=Session，边=项目归属/语义相似/显式引用三种关系
- 前端 /knowledge-base 双视图（搜索 + 图谱）
- Workspace 活跃工具面板从假数据切换为真实状态

**Non-Goals:**
- 不做向量数据库（Milvus/Qdrant 等），当前规模 Python 内存排序足够
- 不做 RAG 生成（检索结果直接展示，不让 LLM 再总结一遍）
- 不做知识条目的版本管理和编辑历史
- 不做文档上传解析（仅 SessionResult 自动入库）
- 不做知识导出（那是另一个 change）

## Decisions

### 1. Embedding 策略：复用 LLM API

**选择**：调用现有 LLM API 的 `/embeddings` endpoint（OpenAI 兼容），模型使用 `text-embedding-3-small`（1536 维）。向量存储为 SQLite BLOB（`json.dumps(vector).encode()` 或 `struct.pack`）。

**备选**：本地 embedding 模型（sentence-transformers）

**理由**：
- 零新依赖——LLM Gateway 已有 httpx 调用能力和鉴权逻辑
- embedding 调用频率低（入库时 1 次/条目，搜索时 1 次/查询）
- 未来切换到本地模型时，替换 `generate_embedding()` 函数即可

**向量存储格式**：`BLOB`，使用 `struct.pack(f'{len(vec)}f', *vec)` 序列化，每条 1536 × 4 = 6KB。1 万条目约 60MB，SQLite 完全能承载。

### 2. 相似度计算：内存 cosine

**选择**：搜索时加载所有条目的 `(id, embedding)` 到内存，numpy 计算 cosine_similarity 矩阵，取 top-k。返回时 JOIN 业务字段。

```python
def search(query_embedding, entries, top_k=20):
    matrix = np.array([e.embedding for e in entries])
    query = np.array(query_embedding).reshape(1, -1)
    scores = cosine_similarity(query, matrix)[0]
    top_indices = np.argsort(scores)[-top_k:][::-1]
    return [(entries[i], scores[i]) for i in top_indices]
```

**备选**：SQLite 扩展（sqlite-vss）、FAISS

**理由**：1 万条目 × 1536 维 = 60MB 矩阵，numpy 计算 < 10ms。不需要额外依赖。超过 5 万条目时考虑 FAISS。

### 3. KnowledgeEntry 模型

```python
class KnowledgeEntry(SQLModel, table=True):
    id: str = new_id("kb")
    source_session_id: str  # FK → DiscussionSession
    project_id: str         # FK → Project（冗余，便于筛选）
    user_id: str            # FK → User（数据隔离）
    
    topic: str
    conclusion: str
    key_conflicts: list[dict] = []   # JSON
    role_summaries: list[dict] = []  # JSON
    risks: list[dict] = []           # JSON
    actions: list[dict] = []         # JSON
    
    scenario_code: str
    tags: list[str] = []   # 自动提取 + 手动添加
    
    search_text: str        # 全量可搜索文本拼接（用于 FTS 或 fallback 搜索）
    embedding: bytes | None # 1536 维 float32 BLOB
    
    reference_count: int = 0  # 被 Host Agent 引用的次数
    created_at: datetime
    updated_at: datetime
```

`search_text` 是 `topic + conclusion + json.dumps(key_conflicts) + json.dumps(role_summaries) + json.dumps(risks) + json.dumps(actions)` 的拼接，用于 embedding 生成和 fallback 关键词搜索。

### 4. 入库时机与幂等

Session 完成时（`finalize_minutes` 后）调用 `knowledge.create_entry(session_id)`。检查 `source_session_id` 是否已存在条目——已存在则更新（SessionResult 可能被重新生成），不存在则创建。

### 5. SEARCH_KNOWLEDGE 决策流

```
Host Agent 决策:
  action: "SEARCH_KNOWLEDGE"
  query: "微服务边界划分最佳实践"
  reason: "当前议题涉及服务边界，需参考历史决策"

系统执行:
  1. generate_embedding(query)
  2. 在 user 的知识条目中 cosine_similarity 取 top 3
  3. 写入 knowledge_referenced 事件（含匹配条目摘要）
  4. 将匹配条目的 conclusion + key_conflicts 注入下一轮决策上下文
  5. 更新 KnowledgeEntry.reference_count
```

Host Agent 决策 prompt 中添加知识库引用说明：当检索到历史案例时，应在决策中引用具体案例 ID。

### 6. 知识图谱

三种边类型：

| 类型 | 条件 | 权重 |
|------|------|------|
| SAME_PROJECT | 同 project_id | 0.3 |
| SEMANTIC_SIMILAR | embedding cosine > 0.75 | cosine 值 |
| EXPLICIT_REFERENCE | Host Agent 明确引用了该条目 | 0.9 |

`GET /knowledge/graph?project_id=&limit=50` 返回：

```json
{
  "nodes": [
    {"id": "kb_xxx", "topic": "微服务拆分策略", "project": "支付平台", "scenario": "技术方案评审"}
  ],
  "edges": [
    {"source": "kb_xxx", "target": "kb_yyy", "type": "SEMANTIC_SIMILAR", "weight": 0.87}
  ]
}
```

前端使用 **vis-network**（轻量，React 封装 `vis-network-react`）渲染力导向图。节点大小 = 引用次数，颜色 = 项目，连线粗细 = 权重。

### 7. 前端双视图

`/knowledge-base` 页面顶部切换栏：
- "列表视图"：搜索框 + 筛选器 + KnowledgeCard 列表（分页）
- "图谱视图"：全屏力导向图，点击节点弹出侧边面板展示详情

两个视图共享同一数据源和筛选条件。

### 8. 历史数据回填

首次启动时检测已有 SessionResult 是否已有对应的 KnowledgeEntry。若缺失且 Session 状态为 completed，触发批量回填——逐条生成 embedding 并创建 KnowledgeEntry。通过 background task 异步执行，不阻塞 API 启动。

## Risks / Trade-offs

- **[embedding API 成本]**：每条入库调用 1 次 embedding + 每次搜索调用 1 次。按 1000 条目 + 100 次/天搜索估算，约 1100 次/天。GPT-4o-mini embedding 定价极低（$0.02/1M tokens）。→ 成本可忽略。
- **[embedding API 不可用时搜索降级]**：若 embedding 生成失败（超时/API 不可用），fallback 到 search_text 列的 LIKE 关键词搜索。→ 搜索质量下降但不中断。
- **[内存 cosine 上限]**：条目数超过 5 万后可能慢 → 当前阶段远未达到。设计上预留了 FAISS 切换点（替换 `_compute_similarity()` 函数）。
- **[vis-network 包体积]**：~50KB gzipped。→ 可接受，且图谱视图为可选 tab，不影响首屏加载（动态 import）。

## Open Questions

无。所有设计决策已在探索阶段对齐。
