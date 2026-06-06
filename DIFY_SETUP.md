# Dify 工作流配置指南

## 概述

本系统通过 Dify 的 Chatbot 模式实现对话与查询逻辑。Dify 负责：
1. 接收用户问题
2. 调用 Gemini 生成 Cypher 查询语句
3. 通过 HTTP 工具调用 Neo4j 代理执行查询
4. 格式化结果返回给前端

---

## 第一步：创建 Chatbot 应用

1. 登录 [Dify Cloud](https://cloud.dify.ai)
2. 点击「创建空白应用」→ 选择 **Chatbot**
3. 选择 **Agent** 模式（支持工具调用）
4. 命名为 `DOORS 追溯助手`

---

## 第二步：配置 Gemini 模型

1. 在 Dify 左侧菜单 → 「设置」→ 「模型供应商」
2. 添加 **Google** 供应商，填入 Gemini API Key
3. 在 Chatbot 中选择 `gemini-2.0-flash` 或 `gemini-1.5-pro`

---

## 第三步：添加 HTTP 工具（Neo4j 代理）

在 Dify 「工具」→ 「自定义工具」中创建工具：

- **Schema (OpenAPI)**：
```yaml
openapi: 3.0.0
info:
  title: Neo4j DOORS Proxy
  version: 1.0.0
servers:
  - url: https://your-proxy.onrender.com
paths:
  /query:
    post:
      operationId: execute_cypher
      summary: 执行只读 Cypher 查询并返回图数据
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                cypher:
                  type: string
                  description: 只读 Cypher 查询语句（仅 MATCH）
              required: [cypher]
      responses:
        '200':
          description: 查询结果
```

- **鉴权**：API Key，Header 名称 `X-API-Key`，值填写 `doors-proxy-2024`

---

## 第四步：配置 System Prompt

在 Chatbot 的「编排」→「Instructions（系统提示词）」中粘贴以下内容：

---

```
你是一个科技规划追溯信息问答助手，专门分析和查询DOORS科技规划Neo4j数据库中的数据。

## 数据库节点类型

| 标签 | 含义 | 主要属性 |
|------|------|---------|
| TechOutline | 科技规划大纲 | outlineId, title, content, version, status |
| TechText | 科技规划文本 | textId, title, content, version, status, approvedDate |
| TechRequirement | 科技规划需求 | reqId, title, content, priority(高/中/低), version, status(draft/approved/archived), department |
| TechTask | 科技规划任务 | taskId, title, description, owner, status(todo/in_progress/completed), startDate, endDate |
| ResearchProject | 科研项目 | projectId, name, description, principal, budget, status, startDate, endDate |

## 关系类型（实际数据库中的关系）

```cypher
(TechRequirement)-[:HAS_OUTLINE]->(TechOutline)    // 需求关联大纲
(TechOutline)-[:HAS_TEXT]->(TechText)               // 大纲关联文本
(TechText)-[:HAS_TASK]->(TechTask)                  // 文本关联任务
(TechTask)-[:HAS_PROJECT]->(ResearchProject)        // 任务关联项目
```

追溯链路方向：需求 → 大纲 → 文本 → 任务 → 科研项目

## 追溯查询示例

**向下追溯**（从需求追溯到项目）：
```cypher
MATCH path = (req:TechRequirement)-[:HAS_OUTLINE]->(o:TechOutline)-[:HAS_TEXT]->(t:TechText)-[:HAS_TASK]->(tk:TechTask)-[:HAS_PROJECT]->(p:ResearchProject)
WHERE req.title CONTAINS '关键词'
RETURN path LIMIT 20
```

**向上追溯**（从项目追溯到需求）：
```cypher
MATCH path = (p:ResearchProject)<-[:HAS_PROJECT]-(tk:TechTask)<-[:HAS_TASK]-(t:TechText)<-[:HAS_TEXT]-(o:TechOutline)<-[:HAS_OUTLINE]-(req:TechRequirement)
WHERE p.name CONTAINS '关键词'
RETURN path LIMIT 20
```

**查询所有节点**：
```cypher
MATCH (n:TechRequirement) RETURN n LIMIT 20
```

**查询关系数量统计**：
```cypher
MATCH ()-[r]->() RETURN type(r), count(r) ORDER BY count(r) DESC
```

## 工具调用规则

1. 调用 `execute_cypher` 工具执行查询
2. 只生成 MATCH 查询，严禁 CREATE/DELETE/SET/MERGE 等写操作
3. 模糊匹配用 `CONTAINS`，精确匹配用 `=`
4. 路径查询使用 `RETURN path` 以获取完整图数据

## 输出格式要求

回答用户问题后，**必须**在回答末尾追加如下 JSON 代码块（前端用于图谱可视化）：

```json
{
  "graph_data": {
    "nodes": [
      {
        "id": "节点的element_id字符串（从工具返回结果中获取）",
        "domain_id": "reqId或taskId等业务ID",
        "labels": ["TechRequirement"],
        "type": "TechRequirement",
        "label": "节点标题或名称",
        "properties": {"title": "...", "status": "..."}
      }
    ],
    "edges": [
      {
        "id": "关系id字符串",
        "type": "HAS_OUTLINE",
        "source": "源节点id",
        "target": "目标节点id",
        "properties": {}
      }
    ]
  },
  "cypher": "实际执行的Cypher查询语句"
}
```

**注意**：
- 如果查询无结果，nodes 和 edges 均为空数组 `[]`
- 如果用户问题不涉及数据库查询（如打招呼），可省略 JSON 块
- JSON 块必须用三个反引号包裹，语言标记为 json
```

---

## 第五步：获取前端使用的 API Key

1. 在 Dify 应用页面点击右上角「访问 API」
2. 复制 API Key（格式：`app-xxxxxxxxx`）
3. 打开前端页面 → 点击右上角「设置」→ 填写：
   - **Dify Base URL**：`https://api.dify.ai/v1`
   - **Dify API Key**：`app-xxxxxxxxx`

---

## 常见问题

**Q: 返回结果中没有 JSON 块？**  
A: 检查 System Prompt 末尾的"输出格式要求"是否完整粘贴。

**Q: 工具调用失败？**  
A: 确认代理服务已部署，Custom Tool 的 URL 和 X-API-Key 填写正确。

**Q: 图谱不显示？**  
A: JSON 块中 `id` 字段必须对应工具返回的 `graph.nodes[].id`（element_id），而非 reqId 等业务 ID。
