---
name: debug-trace
description: 'Debug DOORS traceability query failures. Use when: Cypher queries return no results, graph visualization is empty, Dify tool calls fail, LLM response parsing errors, trace chains appear broken, or debugging the Neo4j-Dify-Frontend pipeline.'
---

# 调试追溯查询

## 适用场景
- 追溯查询无结果或结果不符合预期
- 图谱面板显示空白或节点缺失
- Dify 返回"工具调用失败"或超时
- LLM 响应中 JSON 块解析失败，图谱无法渲染
- 链路断裂（某个环节缺少关联节点或关系）

## 分层排查流程

按从底层到上层的顺序逐层排查：

### 第一层：Neo4j 数据库层

确认数据库中数据是否完整：

```bash
# 检查所有节点类型及数量
curl -X POST https://<proxy-url>/query \
  -H "X-API-Key: <proxy-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"cypher": "MATCH (n) RETURN distinct labels(n) as labels, count(n) as cnt"}'
```

```bash
# 检查所有关系类型及数量
curl -X POST https://<proxy-url>/query \
  -H "X-API-Key: <proxy-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"cypher": "MATCH ()-[r]->() RETURN type(r), count(r) ORDER BY count(r) DESC"}'
```

检查要点：
- [ ] 5 种节点标签（TechRequirement, TechOutline, TechText, TechTask, ResearchProject）都存在且数量 > 0
- [ ] 关系类型名称与 `SCHEMA_INFO` 和 Dify System Prompt 中定义一致
- [ ] 注意区分新旧关系名称（如 `HAS_OUTLINE` vs `CONTAINS`）

### 第二层：Neo4j 代理层

```bash
# 健康检查
curl https://<proxy-url>/health
# 预期：{"status":"ok"}

# 查看 Schema
curl https://<proxy-url>/schema
# 预期：返回 nodes 和 relationships 数组
```

检查要点：
- [ ] `/health` 返回正常
- [ ] `/schema` 返回的节点和关系定义与实际数据库一致
- [ ] 写操作被正确拦截：发送 `CREATE` 语句应返回 400
- [ ] Render 免费实例可能休眠，首次请求需要 30-60 秒冷启动

### 第三层：Dify 编排层

在 Dify 后台检查：
- [ ] System Prompt 中的节点/关系定义表是否与 `SCHEMA_INFO` 一致
- [ ] HTTP 工具（`execute_cypher`）的 URL 指向正确的代理地址
- [ ] HTTP 工具的 `X-API-Key` 值与代理的 `PROXY_API_KEY` 一致
- [ ] 在 Dify 日志中查看 LLM 实际生成的 Cypher 语句是否正确
- [ ] 检查 LLM 是否生成了写操作语句（会被代理拦截）
- [ ] 确认选择的模型有足够的 Cypher 生成能力（推荐 gemini-2.0-flash 或 deepseek-chat）

### 第四层：前端解析层

打开浏览器 DevTools：
1. **Network 标签** → 查看 Dify SSE 流式响应
   - 找到 `chat-messages` 请求
   - 查看 EventStream，确认 `agent_message` 事件中包含完整文本
   - 确认文本末尾包含 ` ```json {...} ``` ` 代码块
2. **解析验证**
   - 在 Console 中手动执行 JavaScript 测试 `responseParser.ts` 的 `parseAssistantResponse` 函数
   - 检查 `graphData.nodes[].id` 是否为有效的 Neo4j `element_id` 格式（如 `4:xxx:xxx`）
3. **图谱渲染验证**
   - 检查 `NODE_TYPE_COLOR` 是否包含被返回的所有节点 type
   - 检查 `NODE_TYPE_LABEL` 中是否有对应中文标签

### 第五层：前端交互层

- [ ] 确认设置面板中的 4 个配置项均已填写
- [ ] `difyApiKey` 格式为 `app-xxxxxxxxx`
- [ ] `difyBaseUrl` 末尾无多余 `/`（正确：`https://api.dify.ai/v1`）
- [ ] `proxyUrl` 和 `proxyApiKey` 与 Render 代理配置一致

## 快速诊断脚本

将以下命令中的占位符替换后执行，一次性获取数据库全貌：

```bash
PROXY_URL="https://your-proxy.onrender.com"
API_KEY="doors-proxy-2024"

echo "=== 节点统计 ==="
curl -s -X POST "$PROXY_URL/query" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cypher": "MATCH (n) RETURN distinct labels(n) as labels, count(n) as cnt"}'

echo -e "\n=== 关系统计 ==="
curl -s -X POST "$PROXY_URL/query" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cypher": "MATCH ()-[r]->() RETURN type(r), count(r) ORDER BY count(r) DESC"}'

echo -e "\n=== 完整追溯链抽样 ==="
curl -s -X POST "$PROXY_URL/query" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cypher": "MATCH path = (req:TechRequirement)-[*1..4]->(proj:ResearchProject) RETURN path LIMIT 1"}'
```

## 常见错误速查

| 现象 | 可能原因 | 排查入口 |
|------|----------|----------|
| 图谱完全空白 | Dify 未返回 JSON 块 | 第四层：检查 SSE 响应 |
| 图谱有节点无连线 | 关系中 `source`/`target` 的 ID 与 `nodes[].id` 不匹配 | 第四层：检查 element_id |
| 节点颜色全灰 | 节点 type 不在 `NODE_TYPE_COLOR` 中 | 第四层：检查 types/index.ts |
| "只允许 MATCH 查询" | LLM 生成了写操作语句 | 第三层：检查 Dify 日志 |
| "Invalid API key" (代理 401) | PROXY_API_KEY 不匹配 | 第二层：检查代理 .env |
| "Invalid API key" (Dify 401) | difyApiKey 格式错误 | 第五层：检查设置面板 |
| 代理返回 503 | Render 冷启动中 | 等待 30-60 秒重试 |
