# 网页视觉方案全面优化 — 设计文档

**日期:** 2026-07-08
**范围:** `frontend/` React 前端，纯视觉层（design tokens + className + Cytoscape 样式），不改业务逻辑/数据流。

## 1. 目标与背景

用户要求全面优化网页视觉方案，三个核心诉求：

1. **对比度** — 亮色与暗色主题下所有元素文字均清晰可读（目标 WCAG AA：正文 ≥ 4.5:1，大字/UI 元素 ≥ 3:1）。
2. **一致性** — 文字样式与图形样式（阴影、边框、圆角、焦点环）统一。
3. **经典设计方案** — 已选定方向。

### 已确认决策

- **品牌主色:** 由中国中车红 (#C70019) 改为**科技蓝 `#1677ff` (Ant Design 蓝)** 作为主强调色。红色降级，仅用于 Logo 品牌标识 + 危险/删除/警示语义。
- **视觉风格:** 清爽企业后台 (Material / Ant Design Pro 风)，亮色优先（light-first），同时暗色主题需完整打磨、对比达标。
- **迁移范围:** 全量迁移 —— 移除现有「把 Tailwind `indigo-*` 覆盖成红色」的 hack，引入干净的 `primary` 蓝色语义标尺，并把所有组件中的 `indigo-*` 类名迁移为 `primary` / token 类。

### 现状问题（调研结论）

- **半迁移调色板:** `index.css` 用 `@theme` 把 `--color-indigo-*` 覆盖为红色系；但 prose 代码块、表头、`pulse-glow` 动画里仍残留真正的靛蓝 `rgba(99,102,241,…)`，与红色品牌冲突。
- **亮色模式对比不足:** `text-indigo-300/400`（映射到浅红 `#ff8590` / `#ff4d5f`）用在浅色卡片上（图谱节点/关系计数徽章、激活菜单项），可读性差。
- **阴影/边框/圆角不统一:** 混用 `shadow-2xl` / `shadow-lg` / 硬编码 `shadow-[rgba(199,0,25,.25)]`；圆角散落 `rounded-lg` / `rounded-[6px]` / `rounded-xl`；无共享标尺。
- **硬编码 hex:** Cytoscape 图谱样式中大量硬编码颜色，未走 token。

## 2. 色彩系统（Design Tokens 重构）

在 `frontend/src/index.css` 中重建 token 体系。删除 `--color-indigo-*` 红色覆盖，定义语义化 `primary` 蓝色标尺 + 中性面 + 语义色。

### Primary — 科技蓝 (#1677ff family)

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `--color-primary` | `#1677ff` | `#3b82f6` | 主按钮、激活态、链接、图谱选中边/边选中 |
| `--color-primary-hover` | `#4096ff` | `#60a5fa` | hover |
| `--color-primary-active` | `#0958d9` | `#2563eb` | pressed |
| `--color-primary-soft` | `#e6f0ff` | `rgba(59,130,246,.15)` | 选中背景、tag 底、软填充 |
| `--color-primary-border` | `rgba(22,119,255,.35)` | `rgba(96,165,250,.35)` | 强调描边、hover 边框 |

同时提供完整 `--color-primary-50 … -900` 数值标尺（供需要梯度处的使用），并在 `@theme` 中注册 `--color-primary-*`，使 Tailwind 生成 `bg-primary-500`、`text-primary-400` 等工具类，替代旧 `indigo-*`。

### 语义色 (semantic)

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `--color-success` | `#52c41a` | `#73d13d` | 成功 |
| `--color-warning` | `#faad14` | `#ffc53d` | 警告 |
| `--color-danger` | `#ff4d4f` | `#ff7875` | 危险/删除/错误 |
| `--color-crrc-red` | `#C70019` | `#C70019` | **仅** Logo 品牌方块 |

### 中性面 (surfaces) — 两主题对比达标

**Light:**

| Token | 值 |
|---|---|
| `--color-bg-primary` (app 底) | `#f5f7fa` |
| `--color-bg-secondary` (次级面/顶栏) | `#ffffff` |
| `--color-bg-card` | `#ffffff` |
| `--color-bg-hover` | `#f0f4fa` |
| `--color-bg-input` | `#f5f7fa` |
| `--color-bg-code` | `#f2f4f8` |
| `--color-border` | `rgba(0,0,0,.09)` |
| `--color-border-strong` | `rgba(0,0,0,.16)` |
| `--color-text-primary` | `rgba(0,0,0,.88)` |
| `--color-text-secondary` | `rgba(0,0,0,.60)` |
| `--color-text-muted` | `rgba(0,0,0,.42)` |

**Dark:**

| Token | 值 |
|---|---|
| `--color-bg-primary` | `#0d1017` |
| `--color-bg-secondary` | `#151823` |
| `--color-bg-card` | `#1a1e2b` |
| `--color-bg-hover` | `#232838` |
| `--color-bg-input` | `#12151f` |
| `--color-bg-code` | `#0d0f18` |
| `--color-border` | `#262b3a` |
| `--color-border-strong` | `#39415a` |
| `--color-text-primary` | `#e6e8eb` |
| `--color-text-secondary` | `#a8b0bd` |
| `--color-text-muted` | `#6b7686` |

> 命名保留现有 `--color-bg-*` / `--color-text-*` / `--color-border` 键，仅改值并新增 `-strong` 等，降低组件改动面。旧的 `--color-text-emphasis` / `-dim` 保留以兼容，值随主题对齐。

## 3. 形状一致性标尺（Elevation / Radius / Border / Focus）

新增 token，按角色统一应用：

### 阴影 (Elevation)

| Token | Light | Dark | 角色 |
|---|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,.05)` | `0 1px 2px rgba(0,0,0,.3)` | 输入、分隔 |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)` | `0 1px 3px rgba(0,0,0,.4)` | 卡片、气泡 |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,.10)` | `0 4px 14px rgba(0,0,0,.5)` | 下拉、浮层、图例 |
| `--shadow-lg` | `0 12px 32px rgba(0,0,0,.14)` | `0 16px 40px rgba(0,0,0,.6)` | 弹窗 (Modal) |

废弃硬编码的 `shadow-[rgba(199,0,25,.25)]` 与散用的 `shadow-2xl/lg`。

### 圆角 (Radius) — 沿用现有键，统一按角色应用

- 按钮 / 输入 / 徽章按钮：`--radius-md` (10px)
- 卡片 / 面板 / 弹窗 / 下拉：`--radius-lg` (16px)
- 药丸 / 计数徽章 / 图例点：`--radius-full`
- 移除零散的 `rounded-[6px]`，统一到标尺。

### 边框

- 默认 `1px solid var(--color-border)`；强调/hover 用 `var(--color-border-strong)` 或 `var(--color-primary-border)`。
- 去除半透明与实色混用。

### 焦点环 (Focus)

- 全站统一：`outline: 2px solid var(--color-primary); outline-offset: 2px;`
- 修正 `index.css` 中无效的 `ring: 2px …` 写法（`.glow-ring`），改为标准 `box-shadow` 焦点环。

## 4. 组件逐一落地

所有组件遵循：颜色/阴影/边框/圆角/焦点一律走上面的 token；`indigo-*` 类 → `primary-*` 或 `var(--color-*)`。

- **Header (`Header.tsx`):** 亮色白 / 暗色深顶栏 + `--shadow-xs` 底分隔；去掉 `via-indigo-500/40` 渐变线，改中性或 `primary` 细线；**Logo 方块保留中车红**（唯一品牌红锚点）；主题切换 & 设置按钮统一「次要按钮」样式（token 边框 + hover）；移动端 Tab `bg-indigo-600` → `bg-primary`。
- **ChatPanel (`ChatPanel.tsx`):** 输入区、发送按钮、ConditionBar 容器走 token；发送/主操作按钮 = `--color-primary`。
- **MessageBubble (`MessageBubble.tsx`):** 用户气泡 = `--color-primary` 实色 + 白字；助手气泡 = `--color-bg-card` + `--shadow-sm` + token 边框；思考/引用块用 `--color-bg-think` / `--color-bg-code`。
- **GraphPanel (`GraphPanel.tsx`):** 工具按钮、下拉、设置面板、图例、计数徽章全部 token；`buildCyStyle` 硬编码色改为按主题从 token 取（画布 `--color-bg-primary`、边 `edgeColor`、标签底 `edgeLabelBg`）；**选中边 `#C70019` → `--color-primary` 蓝**；`.highlighted` 高亮色由浅红改 `--color-primary`；`accent-indigo-500` 滑块 → `accent-[var(--color-primary)]`；节点分类彩色标尺（`NODE_TYPE_COLOR` in `types/index.ts`）保留以保证图谱可读性，但将与主色蓝最接近的 `TechOutline #3b82f6` 调整为更可区分的色值，避免与「选中蓝」混淆。
- **SchemaPanel / NodeDetail / ConfigModal / ConditionBar:** 统一卡片面、边框、按钮、hover、焦点；`ConfigModal` 遮罩用 `--color-overlay`，弹窗用 `--shadow-lg`；输入聚焦边框 `--color-primary`。
- **index.css:** 删除 `@theme` 中 `--color-indigo-*` 红覆盖；改注册 `--color-primary-*`；替换 `.prose-chat` 中 `rgba(99,102,241,…)` 靛蓝残留为 `--color-primary-soft` / token；替换 `.shimmer` 与 `pulse-glow` 中的蓝紫为 primary 或中性；修正 `.glow-ring` 焦点写法。

## 5. 验证策略

- **对比度:** 对关键前景/背景对（正文、次要文字、徽章文字、按钮文字、气泡文字）在两主题下逐一核验达到 WCAG AA。
- **视觉回归:** 用 Playwright 在亮/暗两主题下对主要屏幕（对话、图谱、Schema 面板、节点详情、设置弹窗）截图检查。
- **构建校验:** `npm run build`（tsc + vite）与 `npm run lint` 通过；`npm test` 现有测试不回归。
- **无逻辑改动:** 确认 diff 仅触及样式（className / css / Cytoscape 样式对象），不改数据流与状态逻辑。

## 6. 明确不做 (YAGNI)

- 不改任何业务逻辑、数据获取、状态管理、组件结构/拆分。
- 不新增主题（仍为 light + dark 双主题）。
- 不引入新依赖（不加 UI 组件库；沿用 Tailwind v4 + CSS 变量）。
- 不改图谱布局算法、不改 Markdown 渲染管线。
