---
name: deploy
description: 'Deploy the DOORS Trace Assistant project. Use when: deploying to production, pushing frontend to GitHub Pages, checking Render proxy status, releasing a new version, or running deployment verification.'
---

# 部署发布

## 适用场景
- 前端代码更新后推送到 GitHub Pages
- 检查 neo4j-proxy 在 Render 上的运行状态
- 发布新版本前做完整性检查
- 部署后验证端到端功能

## 前置条件
- GitHub Actions 已配置（`.github/workflows/` 中存在部署文件）
- Render 服务已创建并关联 neo4j-proxy 仓库
- 环境变量已在 GitHub Secrets / Render Env Vars 中配置：
  - GitHub Secrets（可选）：`VITE_DIFY_API_KEY`, `VITE_DIFY_BASE_URL`, `VITE_PROXY_URL`, `VITE_PROXY_API_KEY`
  - Render Env Vars：`NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `PROXY_API_KEY`

## 部署步骤

### 1. 部署前检查
执行以下检查，确保所有检查项通过：

```bash
# 前端构建检查
cd frontend && npm run build
```

检查清单：
- [ ] `npm run build` 无 TypeScript 编译错误
- [ ] `npm run lint` 无新增 ESLint 告警
- [ ] `neo4j-proxy/main.py` 的 `SCHEMA_INFO` 与 `DIFY_SETUP.md` 中的节点/关系定义一致
- [ ] `frontend/src/types/index.ts` 的 `NODE_TYPE_COLOR` 包含所有 5 种节点类型的配色
- [ ] `vite.config.ts` 中 `base` 字段为 `/Tech_plan_trace_assistant/`

### 2. 提交代码
```bash
git add -A
git commit -m "deploy: <描述本次变更>"
git push origin main
```

### 3. 验证部署

#### 前端（GitHub Pages）
等待 GitHub Actions 完成后（约 1-2 分钟），访问：
```
https://lxy34232.github.io/Tech_plan_trace_assistant/
```

#### 代理（Render）
```bash
curl https://<your-proxy>.onrender.com/health
# 预期返回：{"status":"ok"}
```

#### 端到端验证
在前端发送以下测试问题，确认正常返回并显示图谱：
- "查询所有高优先级的科技规划需求"
- "大纲包含哪些文本？"

### 4. 常见问题

| 问题 | 排查方向 |
|------|----------|
| 前端 404 或白屏 | 检查 `vite.config.ts` 中 `base` 字段是否为 `/Tech_plan_trace_assistant/` |
| 代理 502/503 | Render 免费实例会休眠，首次访问需等待 30-60 秒冷启动 |
| 代理返回 401 | 检查 `PROXY_API_KEY` 和前端设置中的 `proxyApiKey` 是否一致 |
| 图谱不显示 | 检查 Dify System Prompt 中输出格式要求是否完整，LLM 是否返回了 JSON 块 |
| Dify API 报错 | 检查前端设置中的 `difyApiKey` 和 `difyBaseUrl` 是否正确 |
| GitHub Actions 失败 | 检查 `VITE_*` 开头的 Secrets 是否在仓库 Settings → Secrets 中配置 |
