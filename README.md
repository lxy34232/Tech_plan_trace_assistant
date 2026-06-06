# DOORS 科技规划追溯问答助手

基于 Neo4j + Dify + Gemini 的自然语言科技规划数据问答与追溯可视化系统。

## 架构

```
前端 (React + GitHub Pages)
    ↓ Dify API
Dify Chatbot (Gemini + 工具调用)
    ↓ HTTP
Neo4j 代理 (FastAPI + Render)
    ↓ Bolt
Neo4j Aura 数据库
```

## 快速开始

### 1. 部署 Neo4j 代理

```bash
cd neo4j-proxy
cp .env.example .env   # 填写 NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD / PROXY_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload
```

部署到 Render：将 `neo4j-proxy/` 目录推送，Render 会自动识别 `render.yaml`。

### 2. 配置 Dify

详见 [DIFY_SETUP.md](DIFY_SETUP.md)。

### 3. 本地运行前端

```bash
cd frontend
cp .env.example .env.local   # 可选，也可在运行后在界面设置中填写
npm install
npm run dev
```

### 4. 部署到 GitHub Pages

推送到 `main` 分支后 GitHub Actions 自动部署。

在仓库 Settings → Secrets 添加（可选，也可在界面中实时填写）：
- `VITE_DIFY_API_KEY`
- `VITE_DIFY_BASE_URL`
- `VITE_PROXY_URL`
- `VITE_PROXY_API_KEY`

在仓库 Settings → Pages → Source 选择 **GitHub Actions**。

## 数据库关系设计

```
(TechOutline)-[:CONTAINS]->(TechText)
(TechText)-[:SPECIFIES]->(TechRequirement)
(TechRequirement)-[:DECOMPOSES_TO]->(TechTask)
(TechTask)-[:IMPLEMENTED_BY]->(ResearchProject)
(TechRequirement)-[:REFINES]->(TechRequirement)
(TechTask)-[:DEPENDS_ON]->(TechTask)
```
