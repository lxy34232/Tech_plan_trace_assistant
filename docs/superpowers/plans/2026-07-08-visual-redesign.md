# 网页视觉方案全面优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前端视觉方案从「中车红 + 半迁移暗色仪表盘」统一为「科技蓝 (#1677ff) + 清爽企业后台风格」，两主题对比达标、阴影/边框/圆角/焦点一致。

**Architecture:** 纯视觉层重构。第一步在 `index.css` 重建 design token 体系（新增 `primary` 蓝语义标尺、语义色、elevation 标尺；并把旧 `--color-accent`/`--color-indigo-*` 别名重指向蓝色，使未迁移组件立即变蓝、不破坏）；随后逐组件把 `indigo-*` / 硬编码 `slate-*`/`#C70019`/dark-only 工具类迁移为 token；最后驱动 Cytoscape 图谱颜色走 token 并移除过渡别名。

**Tech Stack:** React 19 + TypeScript + Tailwind CSS v4（CSS 变量主题）+ Cytoscape + lucide-react。

## Global Constraints

- 仅改视觉层：className、`index.css`、Cytoscape 样式对象。**不改**任何业务逻辑、状态、数据流、组件结构、依赖。
- 双主题：light + dark 都必须对比达标（WCAG AA：正文 ≥ 4.5:1，大字/UI ≥ 3:1）。
- 主色：`#1677ff` (Ant 蓝)。红色 `#C70019` **仅**用于 Header Logo 方块；其余红色语义走 `--color-danger`。
- 每个任务结束必须 `npm run build`（在 `frontend/` 下）通过（tsc + vite），且 `npm run lint` 无新增错误。
- 提交信息使用中文 + 结尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。分支：`feat/visual-redesign`（已创建）。
- 所有命令在 `frontend/` 目录下运行（`cd frontend` 后执行）。

### 共享迁移映射表（所有任务通用）

组件里遇到以下类名/值，按此表替换（token 均为运行时 CSS 变量，随主题切换）：

| 现状 | 替换为 | 说明 |
|---|---|---|
| `bg-indigo-600` | `bg-[var(--color-primary)]` | 主实色 |
| `bg-indigo-500/10` `/15` | `bg-[var(--color-primary-soft)]` | 软填充 |
| `bg-indigo-500/20`（hover 态） | `hover:bg-[var(--color-primary-soft)]` | |
| `text-indigo-300` `text-indigo-400` | `text-[var(--color-primary)]` | |
| `border-indigo-500/20` `/25` `/40` `/50` | `border-[var(--color-primary-border)]` | |
| `hover:border-indigo-500/40` | `hover:border-[var(--color-primary-border)]` | |
| `from-indigo-500 to-indigo-700` | `from-[var(--color-primary)] to-[var(--color-primary-active)]` | 头像渐变 |
| `shadow-indigo-500/20` `shadow-indigo-600/15` `/25` | 删除该 shadow 类，改 `shadow-[var(--shadow-sm)]` | |
| `accent-indigo-500` | `accent-[var(--color-primary)]` | range 滑块 |
| `bg-[#C70019] hover:bg-[#e0001c]`（主按钮） | `bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]` | 发送/保存 |
| `shadow-[rgba(199,0,25,0.3)]` `shadow-[rgba(199,0,25,0.25)]` | `shadow-[var(--shadow-sm)]` | |
| `hover:bg-slate-700/50` `hover:bg-slate-700/30` `hover:bg-slate-600/30`（图标按钮 hover） | `hover:bg-[var(--color-bg-hover)]` | |
| `bg-slate-700/30 ... hover:bg-slate-700/50`（幽灵 chip） | `bg-[var(--color-bg-input)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]` | |
| `bg-slate-700 text-white hover:bg-slate-600`（停止按钮） | `bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]` | |
| `bg-slate-500/10` `bg-slate-500/5` | `bg-[var(--color-bg-hover)]` | |
| `text-slate-500` | `text-[var(--color-text-muted)]` | |
| `from-slate-500 to-slate-700`（用户头像） | `from-[var(--color-text-muted)] to-[var(--color-text-secondary)]` | |
| 语义徽章 `text-red-400 bg-red-500/10` | `text-[var(--color-danger-text)] bg-[var(--color-danger-soft)]` | |
| 语义徽章 `text-amber-400 bg-amber-500/10` | `text-[var(--color-warning-text)] bg-[var(--color-warning-soft)]` | |
| 语义徽章 `text-green-400 bg-green-500/10` | `text-[var(--color-success-text)] bg-[var(--color-success-soft)]` | |
| 语义徽章 `text-blue-400 bg-blue-500/10` | `text-[var(--color-primary)] bg-[var(--color-primary-soft)]` | |

> 验证方式说明：本工程为纯视觉重构，无法用单元测试断言观感。每个任务的「测试」= (a) `npm run build` 通过；(b) `grep` 断言目标旧值已清除；最终 Task 10 用 Playwright 双主题截图 + 对比度核验做视觉回归。现有 `npm test`（responseParser 单测）全程不得回归。

---

### Task 1: 重建 design token 体系（index.css）

**Files:**
- Modify: `frontend/src/index.css`

**Interfaces:**
- Produces（后续所有任务消费的 CSS 变量，均在 `:root`=dark 与 `[data-theme="light"]` 两处定义，运行时随主题切换）：
  - Primary: `--color-primary`, `--color-primary-hover`, `--color-primary-active`, `--color-primary-soft`, `--color-primary-border`
  - 语义: `--color-success`, `--color-success-text`, `--color-success-soft`, `--color-warning`, `--color-warning-text`, `--color-warning-soft`, `--color-danger`, `--color-danger-text`, `--color-danger-soft`, `--color-danger-border`
  - Elevation: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`
  - 中性面/文字/边框：沿用现有键名（`--color-bg-*`, `--color-text-*`, `--color-border`），新增 `--color-border-strong`
  - 别名（过渡+兼容）：`--color-accent` `--color-accent-hover` `--color-accent-glow` `--color-border-light` 重指向 primary/border-strong；`--color-crrc-red` 保留 `#C70019`

- [ ] **Step 1: 替换 `@theme` 块** — 把原 `--color-indigo-*`（红覆盖）改为指向蓝色的过渡桥（静态、供未迁移组件的 `indigo-*` 类临时使用；Task 9 移除）。

替换 `index.css` 第 3–15 行整个 `@theme { ... }` 为：

```css
@theme {
  /* 过渡桥：让尚未迁移的 indigo-* 工具类临时渲染为科技蓝，Task 9 移除 */
  --color-indigo-50:  #e6f0ff;
  --color-indigo-100: #bae0ff;
  --color-indigo-200: #91caff;
  --color-indigo-300: #69b1ff;
  --color-indigo-400: #4096ff;
  --color-indigo-500: #1677ff;
  --color-indigo-600: #1677ff;
  --color-indigo-700: #0958d9;
  --color-indigo-800: #003eb3;
  --color-indigo-900: #002c8c;
  --color-indigo-950: #001d66;
}
```

- [ ] **Step 2: 重写 `:root`（dark 默认）token 块** — 替换第 17–49 行 `:root { ... }` 为：

```css
:root {
  /* Dark theme (default) */
  --color-bg-primary: #0d1017;
  --color-bg-secondary: #151823;
  --color-bg-card: #1a1e2b;
  --color-bg-hover: #232838;
  --color-bg-input: #12151f;
  --color-bg-code: #0d0f18;
  --color-bg-think: #12151f;
  --color-border: #262b3a;
  --color-border-strong: #39415a;
  --color-border-light: #39415a;
  --color-text-primary: #e6e8eb;
  --color-text-emphasis: #f3f4f6;
  --color-text-secondary: #a8b0bd;
  --color-text-muted: #6b7686;
  --color-text-dim: #565f70;

  --color-primary: #3b82f6;
  --color-primary-hover: #60a5fa;
  --color-primary-active: #2563eb;
  --color-primary-soft: rgba(59,130,246,0.15);
  --color-primary-border: rgba(96,165,250,0.35);

  --color-accent: #3b82f6;
  --color-accent-hover: #60a5fa;
  --color-accent-glow: rgba(59,130,246,0.15);
  --color-crrc-red: #C70019;

  --color-success: #73d13d;
  --color-success-text: #95de64;
  --color-success-soft: rgba(115,209,61,0.15);
  --color-warning: #ffc53d;
  --color-warning-text: #ffd666;
  --color-warning-soft: rgba(255,197,61,0.15);
  --color-danger: #ff7875;
  --color-danger-text: #ff9c99;
  --color-danger-soft: rgba(255,120,117,0.15);
  --color-danger-border: rgba(255,120,117,0.35);

  --color-overlay: rgba(0,0,0,0.7);
  --color-shadow: rgba(0,0,0,0.5);

  --shadow-xs: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 14px rgba(0,0,0,0.5);
  --shadow-lg: 0 16px 40px rgba(0,0,0,0.6);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;
}
```

- [ ] **Step 3: 重写 `[data-theme="light"]` token 块** — 替换第 51–77 行 `[data-theme="light"] { ... }` 为：

```css
[data-theme="light"] {
  --color-bg-primary: #f5f7fa;
  --color-bg-secondary: #ffffff;
  --color-bg-card: #ffffff;
  --color-bg-hover: #f0f4fa;
  --color-bg-input: #f5f7fa;
  --color-bg-code: #f2f4f8;
  --color-bg-think: #f5f7fa;
  --color-border: rgba(0,0,0,0.09);
  --color-border-strong: rgba(0,0,0,0.16);
  --color-border-light: rgba(0,0,0,0.16);
  --color-text-primary: rgba(0,0,0,0.88);
  --color-text-emphasis: rgba(0,0,0,0.92);
  --color-text-secondary: rgba(0,0,0,0.60);
  --color-text-muted: rgba(0,0,0,0.42);
  --color-text-dim: rgba(0,0,0,0.34);

  --color-primary: #1677ff;
  --color-primary-hover: #4096ff;
  --color-primary-active: #0958d9;
  --color-primary-soft: rgba(22,119,255,0.10);
  --color-primary-border: rgba(22,119,255,0.35);

  --color-accent: #1677ff;
  --color-accent-hover: #0958d9;
  --color-accent-glow: rgba(22,119,255,0.10);
  --color-crrc-red: #C70019;

  --color-success: #52c41a;
  --color-success-text: #389e0d;
  --color-success-soft: rgba(82,196,26,0.12);
  --color-warning: #faad14;
  --color-warning-text: #d48806;
  --color-warning-soft: rgba(250,173,20,0.14);
  --color-danger: #ff4d4f;
  --color-danger-text: #cf1322;
  --color-danger-soft: rgba(255,77,79,0.10);
  --color-danger-border: rgba(255,77,79,0.30);

  --color-overlay: rgba(0,0,0,0.4);
  --color-shadow: rgba(0,0,0,0.12);

  --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.10);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.14);
}
```

- [ ] **Step 4: 清除残留靛蓝并统一 prose/动画** — 在 `index.css` 内做以下精确替换：

  1. `.prose-chat code`（约 197 行）`background: rgba(99,102,241,0.15);` → `background: var(--color-primary-soft);`，并把该规则的 `color`（若无则新增）设为 `color: var(--color-primary);`
  2. `.prose-chat th`（约 231 行）`background: rgba(99,102,241,0.1);` → `background: var(--color-primary-soft);`；`color: var(--color-accent-hover);` → `color: var(--color-primary);`
  3. `.prose-chat em`（约 217 行）`color: var(--color-accent-hover);` → `color: var(--color-primary);`
  4. `@keyframes pulse-glow`（约 136–139 行）两处 `rgba(99, 102, 241, ...)` → `rgba(59,130,246, ...)`（保持 0.2 / 0.4 alpha）
  5. `.glow-ring:focus-visible`（约 187–191 行）删除非法的 `ring: 2px solid ...;`，整块改为：
     ```css
     .glow-ring:focus-visible {
       outline: none;
       box-shadow: 0 0 0 3px var(--color-primary-soft), 0 0 0 1px var(--color-primary);
     }
     ```
  6. `*:focus-visible`（约 245 行）`outline: 2px solid var(--color-accent);` 保留（`--color-accent` 现已是蓝）。

- [ ] **Step 5: 验证 build + 残留清零**

Run:
```bash
cd frontend && npm run build
```
Expected: 构建成功，无 TS/vite 错误。

Run:
```bash
grep -rn "rgba(99, *102, *241" src/ ; grep -rn "e0001c\|c70019\|C70019" src/index.css
```
Expected: 第一条无输出（靛蓝已清零）；第二条无输出（红色已从 css token 移除；`--color-crrc-red` 用大写留在 css 里是允许的——若 grep 命中 `--color-crrc-red: #C70019` 属预期保留，其余不应出现）。

- [ ] **Step 6: 目视确认 app 可启动且整体转蓝**（未迁移组件此时经别名桥应已呈蓝色，无破色）。

Run:
```bash
cd frontend && npm run dev
```
打开浏览器确认页面正常渲染、无控制台报错，随后停止 dev server。

- [ ] **Step 7: Commit**

```bash
git add frontend/src/index.css
git commit -m "style: 重建 design token 体系（科技蓝主色 + 语义色 + elevation 标尺）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Header 迁移

**Files:**
- Modify: `frontend/src/components/Header.tsx`

**Interfaces:**
- Consumes: Task 1 的 `--color-primary*`, `--shadow-xs`, `--color-crrc-red`。

- [ ] **Step 1: 顶栏分隔与渐变线**
  - 第 15 行 header 根：在末尾追加 `shadow-[var(--shadow-xs)]`（保留现有 `border-b`）。
  - 第 16 行渐变线 `via-indigo-500/40` → `via-[var(--color-primary)]/30`。

- [ ] **Step 2: Logo 保留品牌红**（不改）——第 20/23 行 `from-[#C70019] to-[#8a0011]`、`ring-[#C70019]/20`、`shadow-[rgba(199,0,25,0.25)]` 保持不变（这是唯一允许的品牌红锚点）。

- [ ] **Step 3: 移动端 Tab 激活态** — 第 37 行与第 48 行 `bg-indigo-600 text-white shadow-md shadow-indigo-600/25` → `bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]`。

- [ ] **Step 4: 主题/设置按钮 hover 边框** — 第 60 行与第 69 行 `hover:border-indigo-500/40` → `hover:border-[var(--color-primary-border)]`。

- [ ] **Step 5: 验证**

Run:
```bash
cd frontend && npm run build && grep -n "indigo" src/components/Header.tsx
```
Expected: build 成功；grep 无输出。

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Header.tsx
git commit -m "style: Header 迁移至科技蓝 token

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: MessageBubble 迁移（含气泡/加载/语义 chip/错误态）

**Files:**
- Modify: `frontend/src/components/MessageBubble.tsx`

**Interfaces:**
- Consumes: Task 1 的 `--color-primary*`, `--shadow-sm`, `--color-danger*`, `--color-warning-text/-soft`, `--color-success-text/-soft`, `--color-bg-*`。

- [ ] **Step 1: 加载态头像与圆点**（第 21/28 行）
  - `bg-gradient-to-br from-indigo-500 to-indigo-700 ... shadow-md shadow-indigo-500/20` → `bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-active)] ... shadow-[var(--shadow-sm)]`
  - `bg-indigo-400/60` → `bg-[var(--color-primary)]/60`

- [ ] **Step 2: 头像（助手/用户）**（第 40–47 行）
  - 用户：`from-slate-500 to-slate-700 shadow-slate-500/20` → `from-[var(--color-text-muted)] to-[var(--color-text-secondary)] shadow-[var(--shadow-sm)]`
  - 助手：`from-indigo-500 to-indigo-700 shadow-indigo-500/20` → `from-[var(--color-primary)] to-[var(--color-primary-active)] shadow-[var(--shadow-sm)]`

- [ ] **Step 3: 气泡本体**（第 51–57 行）
  - 用户：`bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/15` → `bg-[var(--color-primary)] text-white rounded-tr-sm shadow-[var(--shadow-sm)]`
  - 错误：`bg-red-950/60 border border-red-800/50 text-red-300 rounded-tl-sm` → `bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] text-[var(--color-danger-text)] rounded-tl-sm`
  - 助手：`shadow-sm` → `shadow-[var(--shadow-sm)]`（其余 token 不变）

- [ ] **Step 4: 语义 action chip 统一为「中性底 + 彩色图标」**（保证两主题对比达标）。将「思考过程 / 查询结果 / 复制 / 查看图谱 / Cypher」五个按钮统一为同一 chip 基类，仅图标着色不同。

  - 思考按钮（第 74 行 className）→
    `"text-xs px-3 py-1.5 rounded-full bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-all duration-200 flex items-center gap-1.5 w-full"`
    其内 `<Brain size={11} />` → `<Brain size={11} className="text-[var(--color-warning-text)]" />`
  - 思考内容框（第 81 行）`bg-[var(--color-bg-think)]` 保持；`rounded-xl` 保持。
  - 查询结果按钮（第 92 行）→ 同上 chip 基类；`<Database size={11} />` → 加 `className="text-[var(--color-success-text)]"`
  - 查询结果内容框（第 99 行）`text-emerald-300 bg-[var(--color-bg-code)] border border-emerald-500/20` → `text-[var(--color-text-secondary)] bg-[var(--color-bg-code)] border border-[var(--color-border)]`
  - 复制按钮（第 111 行）`bg-slate-700/30 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-slate-700/50 hover:text-[var(--color-text-primary)]` → `bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]`
  - 查看图谱按钮（第 120 行，主强调 chip）`bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/40` → `bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:border-[var(--color-primary-border)]`
  - Cypher 按钮（第 129 行）→ 同「复制按钮」的中性 chip 基类。

- [ ] **Step 5: 验证**

Run:
```bash
cd frontend && npm run build && grep -n "indigo\|slate-\|red-9\|red-8\|red-3\|emerald" src/components/MessageBubble.tsx
```
Expected: build 成功；grep 无输出。

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/MessageBubble.tsx
git commit -m "style: MessageBubble 迁移至 token（气泡/加载/语义 chip/错误态双主题对比）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: ChatPanel 迁移（空态/建议卡/输入区/发送按钮/Cypher 弹窗）

**Files:**
- Modify: `frontend/src/components/ChatPanel.tsx`

**Interfaces:**
- Consumes: Task 1 的 `--color-primary*`, `--shadow-sm`, `--shadow-lg`, `--color-bg-*`。

- [ ] **Step 1: 空态图标区**（第 209–212 行）
  - `from-indigo-500/20 to-indigo-700/20 border border-indigo-500/20` → `from-[var(--color-primary-soft)] to-[var(--color-primary-soft)] border border-[var(--color-primary-border)]`
  - `<BookOpen className="text-indigo-400" .../>` → `className="text-[var(--color-primary)]"`
  - 第 212 行 `bg-indigo-500/5` → `bg-[var(--color-primary-soft)]`

- [ ] **Step 2: 建议问题卡**（第 223/227/228 行）
  - 第 223 行 `hover:border-indigo-500/40` → `hover:border-[var(--color-primary-border)]`
  - 第 227 行 `bg-indigo-500/10 ... group-hover:bg-indigo-500/20` → `bg-[var(--color-primary-soft)] ... group-hover:bg-[var(--color-primary-soft)]`
  - 第 228 行 `text-indigo-400` → `text-[var(--color-primary)]`

- [ ] **Step 3: 输入容器聚焦态**（第 261 行）
  - `focus-within:border-indigo-500/50 focus-within:shadow-lg focus-within:shadow-indigo-500/5` → `focus-within:border-[var(--color-primary-border)] focus-within:shadow-[var(--shadow-md)]`

- [ ] **Step 4: 输入区按钮**
  - 清空按钮（第 277 行）`hover:bg-slate-700/50` → `hover:bg-[var(--color-bg-hover)]`
  - 停止按钮（第 285 行）`bg-slate-700 text-white hover:bg-slate-600` → `bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]`
  - 发送按钮（第 295 行）`bg-[#C70019] hover:bg-[#e0001c] ... shadow-sm shadow-[rgba(199,0,25,0.3)]` → `bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] ... shadow-[var(--shadow-sm)]`

- [ ] **Step 5: Cypher 弹窗**（第 314/321 行）
  - 第 314 行 `shadow-2xl shadow-[var(--color-shadow)]` → `shadow-[var(--shadow-lg)]`
  - 第 321 行 `text-emerald-300` → `text-[var(--color-text-primary)]`（代码块正文；`bg-[var(--color-bg-code)]` 保持）

- [ ] **Step 6: 验证**

Run:
```bash
cd frontend && npm run build && grep -n "indigo\|slate-\|C70019\|e0001c\|emerald\|shadow-2xl" src/components/ChatPanel.tsx
```
Expected: build 成功；grep 无输出。

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ChatPanel.tsx
git commit -m "style: ChatPanel 迁移至 token（空态/建议卡/输入区/发送按钮/弹窗）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: ConfigModal 迁移

**Files:**
- Modify: `frontend/src/components/ConfigModal.tsx`

**Interfaces:**
- Consumes: `--color-primary*`, `--shadow-lg`, `--color-bg-*`。

- [ ] **Step 1: 输入聚焦态**（Field，第 33 行）
  - `focus:border-indigo-500/50 focus:shadow-[0_0_0_3px_rgba(199,0,25,0.1)]` → `focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-soft)]`

- [ ] **Step 2: 弹窗容器阴影**（第 66 行）`shadow-2xl shadow-[var(--color-shadow)]` → `shadow-[var(--shadow-lg)]`

- [ ] **Step 3: 关闭按钮 hover**（第 76 行）`hover:bg-slate-700/50` → `hover:bg-[var(--color-bg-hover)]`

- [ ] **Step 4: Dify 区块图标**（第 86/87 行）`bg-indigo-500/10` → `bg-[var(--color-primary-soft)]`；`<Zap ... className="text-indigo-400" />` → `text-[var(--color-primary)]`

- [ ] **Step 5: Neo4j 区块图标**（第 110 行）`bg-slate-500/10` → `bg-[var(--color-bg-hover)]`（图标已用 token 文字色，不改）

- [ ] **Step 6: 外链**（第 136 行）`text-indigo-400 hover:text-indigo-300` → `text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]`

- [ ] **Step 7: 取消/保存按钮**
  - 取消（第 146 行）`hover:bg-slate-700/30` → `hover:bg-[var(--color-bg-hover)]`
  - 保存（第 152 行）`bg-[#C70019] hover:bg-[#e0001c] ... shadow-sm shadow-[rgba(199,0,25,0.25)]` → `bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] ... shadow-[var(--shadow-sm)]`

- [ ] **Step 8: 验证**

Run:
```bash
cd frontend && npm run build && grep -n "indigo\|slate-\|C70019\|e0001c\|shadow-2xl\|rgba(199" src/components/ConfigModal.tsx
```
Expected: build 成功；grep 无输出。

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/ConfigModal.tsx
git commit -m "style: ConfigModal 迁移至 token（输入聚焦/主按钮/图标）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: NodeDetail 迁移（含语义徽章双主题对比）

**Files:**
- Modify: `frontend/src/components/NodeDetail.tsx`

**Interfaces:**
- Consumes: `--color-primary*`, `--color-danger-text/-soft`, `--color-warning-text/-soft`, `--color-success-text/-soft`, `--color-bg-*`, `--shadow-md`。

- [ ] **Step 1: 优先级色映射**（第 43–47 行 `PRIORITY_COLORS`）改为：

```tsx
const PRIORITY_COLORS: Record<string, string> = {
  高: 'text-[var(--color-danger-text)] bg-[var(--color-danger-soft)]',
  中: 'text-[var(--color-warning-text)] bg-[var(--color-warning-soft)]',
  低: 'text-[var(--color-success-text)] bg-[var(--color-success-soft)]',
}
```

- [ ] **Step 2: 状态徽章色**（第 85–90 行）逐项替换：
  - `text-green-400 bg-green-500/10` → `text-[var(--color-success-text)] bg-[var(--color-success-soft)]`
  - `text-[var(--color-text-secondary)] bg-slate-500/10` → `text-[var(--color-text-secondary)] bg-[var(--color-bg-hover)]`
  - `text-blue-400 bg-blue-500/10` → `text-[var(--color-primary)] bg-[var(--color-primary-soft)]`
  - `text-[var(--color-text-muted)] bg-slate-500/5` → `text-[var(--color-text-muted)] bg-[var(--color-bg-hover)]`
  - 末项 `text-[var(--color-text-primary)] bg-slate-500/10` → `text-[var(--color-text-primary)] bg-[var(--color-bg-hover)]`

- [ ] **Step 3: 预算色**（第 95 行）`text-amber-400` → `text-[var(--color-warning-text)]`

- [ ] **Step 4: 面板阴影 + 关闭按钮 + 复制按钮 hover**
  - 第 101 行 `shadow-xl shadow-[var(--color-shadow)]` → `shadow-[var(--shadow-md)]`
  - 第 113 行 `hover:bg-slate-700/50` → `hover:bg-[var(--color-bg-hover)]`
  - 第 145 行 `hover:bg-slate-600/30` → `hover:bg-[var(--color-bg-hover)]`
  - 第 149 行 `<Check ... className="text-green-400" />` → `className="text-[var(--color-success-text)]"`

- [ ] **Step 5: 节点标签徽章**（第 166/170 行）
  - `bg-indigo-500/10 text-indigo-400` → `bg-[var(--color-primary-soft)] text-[var(--color-primary)]`
  - `bg-slate-700/30 text-slate-500` → `bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]`

- [ ] **Step 6: 验证**

Run:
```bash
cd frontend && npm run build && grep -n "indigo\|slate-\|green-4\|green-5\|blue-4\|blue-5\|amber-4\|red-4\|shadow-xl" src/components/NodeDetail.tsx
```
Expected: build 成功；grep 无输出。

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/NodeDetail.tsx
git commit -m "style: NodeDetail 迁移至 token（语义徽章双主题对比达标）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: SchemaPanel 迁移（DOM 部分）

**Files:**
- Modify: `frontend/src/components/SchemaPanel.tsx`（本任务仅改 JSX className；Cytoscape 样式在 Task 9）

**Interfaces:**
- Consumes: `--color-primary*`, `--color-danger-text`, `--color-bg-*`, `--color-accent`（已是蓝）。

- [ ] **Step 1: Database 图标**（第 258 行）`text-indigo-400` → `text-[var(--color-primary)]`

- [ ] **Step 2: 错误重试按钮**（第 265 行）`text-red-400 hover:text-red-300` → `text-[var(--color-danger-text)] hover:text-[var(--color-danger)]`

- [ ] **Step 3: 错误文本**（第 309 行）`text-red-400` → `text-[var(--color-danger-text)]`

- [ ] **Step 4: 拖拽把手**（第 249/253 行）当前用 `--color-accent`（已是蓝）—— 无需改。确认保留。

- [ ] **Step 5: 验证**

Run:
```bash
cd frontend && npm run build && grep -n "indigo\|red-4\|red-3\|slate-" src/components/SchemaPanel.tsx
```
Expected: build 成功；grep 无输出。

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/SchemaPanel.tsx
git commit -m "style: SchemaPanel DOM 迁移至 token

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: ConditionBar 复核

**Files:**
- Modify（如需）: `frontend/src/components/ConditionBar.tsx`

**Interfaces:**
- Consumes: 节点分类色（`getNodeColor`，内联 style，保留）。

- [ ] **Step 1: 复核** — ConditionBar 的 tag 颜色来自 `getNodeColor`（分类彩色，内联 style），符合设计（分类色保留）。文字色用 `--color-text-*` token。**确认无 `indigo-*` / 硬编码 slate / dark-only 工具类**：

Run:
```bash
cd frontend && grep -n "indigo\|slate-\|#C70019\|rgba(199\|red-9\|red-8" src/components/ConditionBar.tsx
```
Expected: 无输出 → 本任务无需改动，跳到 Step 3。若有命中，按共享映射表替换。

- [ ] **Step 2:（仅当 Step 1 有命中）** 按映射表替换后 `npm run build`。

- [ ] **Step 3: 若无改动则本任务空过**，不产生 commit。若有改动：

```bash
git add frontend/src/components/ConditionBar.tsx
git commit -m "style: ConditionBar 复核并统一 token

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Cytoscape 图谱颜色 token 化 + 移除过渡桥

**Files:**
- Modify: `frontend/src/components/GraphPanel.tsx`
- Modify: `frontend/src/components/SchemaPanel.tsx`（`buildSchemaStyle`）
- Modify: `frontend/src/types/index.ts`（`NODE_TYPE_COLOR.TechOutline`）
- Modify: `frontend/src/index.css`（移除 `@theme` indigo 过渡桥）

**Interfaces:**
- Consumes: 主题 `isDark` 已在两个 Panel 内可用。

- [ ] **Step 1: GraphPanel `buildCyStyle` 硬编码色 → 主题变量**（第 22–25 行已按 isDark 取色，保留；调整以下选中/高亮为蓝）：
  - 第 69–71 行 `.highlighted` 的 `#ff8590`（三处：border/line/target-arrow）→ `#3b82f6`（暗）/ `#1677ff`（亮）。实现：在 `buildCyStyle` 顶部加 `const highlightColor = isDark ? '#3b82f6' : '#1677ff'`，三处引用 `highlightColor`。
  - 第 98–100 行 `edge:selected` 的 `line-color`/`target-arrow-color` `#C70019` → `highlightColor`；`color: '#ff8590'` → `highlightColor`。

- [ ] **Step 2: GraphPanel DOM 内残留 indigo**
  - 工具按钮 hover（第 255/258/261/264/269/296 行）`hover:border-indigo-500/40` → `hover:border-[var(--color-primary-border)]`
  - 布局菜单激活项（第 282 行）`bg-indigo-500/15 text-indigo-300 border border-indigo-500/25` → `bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary-border)]`
  - 下拉/设置浮层阴影（第 275/302 行）`shadow-2xl shadow-[var(--color-shadow)]` → `shadow-[var(--shadow-md)]`
  - range 滑块（第 306/313 行）`accent-indigo-500` → `accent-[var(--color-primary)]`
  - 计数徽章数字（第 325/328 行）`text-indigo-400` → `text-[var(--color-primary)]`
  - 图例/浮层阴影（第 332 行）`shadow-lg shadow-[var(--color-shadow)]` → `shadow-[var(--shadow-md)]`

- [ ] **Step 3: SchemaPanel `buildSchemaStyle` 硬编码底色**（第 98 行）
  - edge label `'text-outline-color': '#1e2130'`（dark-only）→ 用主题变量：在 `buildSchemaStyle` 顶部加 `const labelOutline = isDark ? '#151823' : '#ffffff'`，第 98 行引用 `labelOutline`。

- [ ] **Step 4: 节点分类色微调**（`types/index.ts` 第 96 行）`TechOutline: '#3b82f6'` → `TechOutline: '#2f54eb'`（靛蓝→更偏群青，与「选中蓝 #1677ff/#3b82f6」区分）。同步第 84 行 `PALETTE` 首项 `'#3b82f6'` → `'#2f54eb'`。

- [ ] **Step 5: 移除 `@theme` 过渡桥** — 现在全部组件已无 `indigo-*` 类。删除 `index.css` 中 Task 1 Step 1 添加的整个 `@theme { --color-indigo-* ... }` 块（Tailwind v4 无该块仍正常工作；若担心其它默认工具类，保留空的 `@theme {}` 或直接删除整块）。

- [ ] **Step 6: 全局残留清零验证**

Run:
```bash
cd frontend && npm run build && grep -rn "indigo\|ff8590\|#C70019\|rgba(99" src/ | grep -v "crrc-red"
```
Expected: build 成功；grep 无输出（`--color-crrc-red: #C70019` 与 Header Logo 的 `#C70019` 是唯一允许项——若命中仅剩 Header Logo 行与 css 的 crrc-red 变量，属预期）。

> 注：上面的 grep 会命中 Header Logo 的 `#C70019`（预期保留）。人工确认命中项仅为 Header Logo（第 20/23 行）与 `--color-crrc-red`，其余为零。

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/GraphPanel.tsx frontend/src/components/SchemaPanel.tsx frontend/src/types/index.ts frontend/src/index.css
git commit -m "style: 图谱颜色 token 化（选中/高亮改蓝）+ 移除 indigo 过渡桥

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: 双主题视觉回归 + 对比度核验

**Files:**
- 无源码改动（除非发现问题回补）。

**Interfaces:**
- Consumes: 完整迁移后的应用。

- [ ] **Step 1: 全量校验**

Run:
```bash
cd frontend && npm run build && npm run lint && npm test
```
Expected: build 成功；lint 无错误；`npm test`（responseParser 单测）全绿。

- [ ] **Step 2: 启动 dev server**（后台）

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Playwright 双主题截图** — 用 playwright MCP 打开本地地址，分别在 dark / light 下截图以下屏幕，逐一目视检查文字清晰、无浅色文字压浅色背景、阴影/边框/圆角一致：
  1. 空态对话页（含建议卡）
  2. 有对话消息 + 语义 chip（思考/查询结果/复制/查看图谱/Cypher）
  3. 错误消息气泡
  4. 图谱页（工具栏、图例、计数徽章、节点/边、选中高亮=蓝）
  5. SchemaPanel（展开，节点/边标签）
  6. NodeDetail 面板（优先级/状态/预算徽章）
  7. ConfigModal 设置弹窗（输入聚焦态）

  切换主题方式：页面右上主题按钮，或 devtools 执行 `document.documentElement.setAttribute('data-theme','light')`。

- [ ] **Step 4: 对比度抽检** — 对下列关键前景/背景对，在 light 与 dark 下用对比度公式核验达到 AA：
  - 正文 `--color-text-primary` on `--color-bg-card` / `--color-bg-primary`（≥4.5）
  - 次要 `--color-text-secondary` on 卡片（≥4.5）
  - 弱化 `--color-text-muted` on 卡片（大字/UI ≥3）
  - 主按钮白字 on `--color-primary`（≥4.5）— light `#1677ff` 白字 ≈ 3.6，**若 <4.5 则将 light `--color-primary` 主实色按钮场景加深**：把 `--color-primary` 用作按钮底时改用 `--color-primary-active`（#0958d9，白字 ≈ 6.5）。记录结论。
  - 语义徽章文字 on 对应 `-soft` 底（≥4.5）
  - 图谱节点白字 on 节点分类色（大字 ≥3）

- [ ] **Step 5: 若发现不达标** — 回到对应 token/组件微调（优先调 token 值），重跑 Step 1–4。修复后单独 commit：
```bash
git commit -am "style: 修正对比度不达标项（<描述>）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: 停止 dev server，输出核验小结**（哪些对通过、是否触发按钮加深回退方案）。

---

## Self-Review 结论

- **Spec 覆盖:** 配色系统(Task 1) / elevation-radius-border-focus(Task 1) / 组件逐一(Task 2–8) / 图谱 token 化(Task 9) / 验证(Task 10) / 残留 indigo 清理(Task 1+9) / 节点色微调(Task 9) —— 全部 spec 章节均有对应任务。
- **对比度专项:** Task 10 Step 4 显式核验含主按钮白字这一已知临界点（#1677ff 白字≈3.6），并给出加深回退（改用 #0958d9）。
- **一致性:** 共享映射表 + elevation/radius token 贯穿所有组件任务。
- **无占位符:** 所有替换均给出精确前后串与行号锚点。
- **类型一致:** 无跨任务函数签名依赖（纯样式）；新增 token 键名在 Task 1 Interfaces 统一定义，后续任务引用一致。
