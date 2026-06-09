# DOORS 科技规划追溯助手 — 项目规范

## 项目概述
基于 Neo4j + Dify + LLM 的科技规划数据自然语言问答与追溯可视化系统。
- 前端：React 19 + TypeScript ~6.0 + Vite 8 + TailwindCSS 4 + Cytoscape.js
- 后端代理：FastAPI (Python) + Neo4j 5.x driver
- AI 编排：Dify Agent 模式（LLM 通过 HTTP 工具调用 Neo4j 代理）
- 部署：GitHub Pages（前端）+ Render（代理）+ Neo4j Aura（数据库）

## 架构硬约束（不可违背）
1. **前端绝不直连 Neo4j**：所有数据库查询必须经过 `neo4j-proxy` 代理
2. **Cypher 只读**：代理层拦截所有写操作（CREATE/MERGE/DELETE/SET/DROP），仅允许 MATCH
3. **LLM 通过 Dify 调用**：前端不直接调用任何大模型 API，统一经 Dify `/chat-messages` 接口
4. **图谱数据格式固定**：LLM 响应的 JSON 块必须符合 `GraphData` 接口（`types/index.ts`）

## 项目结构
```
frontend/              → React SPA，聊天界面 + 图谱可视化
  src/
    components/        → React 组件（ChatPanel, GraphPanel, Header 等）
    services/          → API 调用封装（difyClient.ts）
    types/             → 共享类型定义（index.ts）
    utils/             → 工具函数（responseParser.ts）
neo4j-proxy/           → FastAPI 代理，Cypher 执行 + 安全检查
  main.py              → 代理主入口
  requirements.txt     → Python 依赖
  render.yaml          → Render 部署配置
.github/workflows/     → GitHub Actions 自动部署
DIFY_SETUP.md          → Dify 配置指南（System Prompt 权威来源）
README.md              → 项目总览
```

## 常用命令
```bash
# 前端开发
cd frontend && npm install && npm run dev          # 启动 :5173
cd frontend && npm run build                        # 生产构建
cd frontend && npm run lint                         # ESLint 检查

# 代理开发
cd neo4j-proxy && pip install -r requirements.txt
cd neo4j-proxy && uvicorn main:app --reload         # 启动 :8000

# 环境变量
# neo4j-proxy 需要 .env: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, PROXY_API_KEY
# frontend 可选 .env.local: VITE_DIFY_API_KEY, VITE_DIFY_BASE_URL, VITE_PROXY_URL, VITE_PROXY_API_KEY
```

## 数据模型（单一真相来源）

### 节点类型（5 种）
| 标签 | 含义 | 主键 | 图谱颜色 |
|------|------|------|----------|
| TechRequirement | 科技规划需求 | reqId | #f59e0b (琥珀) |
| TechOutline | 科技规划大纲 | outlineId | #3b82f6 (蓝) |
| TechText | 科技规划文本 | textId | #a855f7 (紫) |
| TechTask | 科技规划任务 | taskId | #10b981 (绿) |
| ResearchProject | 科研项目 | projectId | #ef4444 (红) |

### 关系类型（6 种）
```
TechRequirement → HAS_OUTLINE → TechOutline
TechOutline → HAS_TEXT → TechText
TechText → HAS_TASK → TechTask
TechTask → HAS_PROJECT → ResearchProject
TechRequirement → REFINES → TechRequirement
TechTask → DEPENDS_ON → TechTask
```

### 修改数据模型时的联动清单
当新增/修改节点或关系时，必须同步更新：
1. Neo4j 数据库（Cypher 创建/迁移）
2. `neo4j-proxy/main.py` → `SCHEMA_INFO` 字典
3. `frontend/src/types/index.ts` → `NODE_TYPE_COLOR` + `NODE_TYPE_LABEL` + `RELATION_TYPE_LABEL`
4. `DIFY_SETUP.md` → System Prompt 中的节点/关系定义表
5. Dify 后台 → 更新 System Prompt

## 代码风格
- **TypeScript 严格模式**：`noUnusedLocals: true`，`noUnusedParameters: true`，`verbatimModuleSyntax: true`
- **React 组件**：函数式组件 + Hooks，Props 用 `interface` 定义并导出
- **API 调用**：统一在 `services/` 目录下封装，组件不直接写 fetch
- **类型定义**：所有共享类型在 `types/index.ts`，禁止分散定义
- **样式**：TailwindCSS 4 utility class，使用 CSS 变量定义主题色（`App.css`）
- **Python**：FastAPI 类型提示 + Pydantic 模型验证 + `dotenv` 管理环境变量
- **ESLint**：使用 flat config（`eslint.config.js`），集成 typescript-eslint + react-hooks + react-refresh

## 测试关键路径
- LLM 返回的 JSON 块是否能被 `responseParser.ts` 正确解析（`parseAssistantResponse`）
- Cypher 查询在 Neo4j 代理中是否被正确拦截/放行（`WRITE_PATTERN` 正则）
- 图谱渲染中节点 type 与 `NODE_TYPE_COLOR` 的映射是否完整
- Dify 流式响应（SSE）是否正确处理 `agent_message` 和 `agent_message_end` 事件
- 移动端响应式：`isMobile` 切换聊天/图谱面板

## 参考文档
- Dify 配置：`DIFY_SETUP.md`
- 代理部署：`neo4j-proxy/render.yaml`
- 项目说明：`README.md`
