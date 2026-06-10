---
name: frontend-design
description: 'Design premium, beautiful, modern frontend UI for web applications. Use when: building landing pages, creating dashboards, designing interactive components, styling React applications with TailwindCSS, improving visual quality of existing UI, or implementing immersive user experiences. Covers color theory, typography, motion design, layout principles, and component craftsmanship.'
---

# 前端高级 UI 设计

作为 AI 编程助手，在设计前端界面时，不要仅仅输出功能性的 HTML/CSS。你必须打造**沉浸式的数字体验**。本 Skill 提供了生成高度精致、现代感的 Web 界面的蓝图。

## 技术栈上下文

本项目使用：**React 19 + TypeScript + TailwindCSS 4 + Vite + Cytoscape.js**

## 1. 建立设计基调

在编写任何 UI 代码之前，确定界面要传达的核心情感和视觉识别：

### 设计风格方向
- **极简专业风**：高对比度、克制的配色、精准的间距系统、清晰的层级 —— 适合数据面板、企业工具
- **科技暗黑风**：深色主导、发光霓虹点缀、等宽字体、交错的渐显动画 —— 适合开发者工具、数据平台
- **柔和现代风**：柔和的渐变、圆角、毛玻璃效果（glassmorphism）、微妙的阴影层次 —— 适合现代化 SaaS 产品
- **编辑设计风**：大标题排版、非对称布局、大胆的留白、网格结构 —— 适合内容展示页

> 本项目（DOORS 追溯助手）默认采用**科技暗黑风**：深色背景 `#0f1117`，紫色/蓝色点缀，清晰的数据可视化。

## 2. 结构化设计层次

### 2.1 布局原则
- **视觉层级**：使用尺寸、颜色、间距建立清晰的信息层级
- **网格系统**：TailwindCSS 的 grid/flex 系统，保持一致的间距（4 的倍数：4/8/12/16/24/32）
- **响应式设计**：移动优先（`sm:` 640px, `md:` 768px, `lg:` 1024px, `xl:` 1280px）
- **内容区最大宽度**：`max-w-7xl` (1280px) 作为内容容器上限

### 2.2 配色系统
```css
/* TailwindCSS 4 CSS 变量主题（参考 App.css） */
:root {
  --color-bg-primary: #0f1117;      /* 主背景 */
  --color-bg-secondary: #1a1b2e;    /* 次级背景（卡片等） */
  --color-border: #2d3150;          /* 边框 */
  --color-text-primary: #e2e8f0;   /* 主文字 */
  --color-text-secondary: #94a3b8; /* 次级文字 */
  --color-accent: #6366f1;         /* 强调色（紫蓝） */
  --color-accent-hover: #818cf8;   /* 强调色悬停 */
}
```

**配色规则**：
- 文字与背景对比度至少 4.5:1（WCAG AA 标准）
- 使用 TailwindCSS 任意值语法 `[#hexcolor]` 引用主题色变量，保持颜色来源一致
- 渐变使用相邻色相，不超过 3 个色阶

### 2.3 排版系统
- **标题层级**：`text-4xl` → `text-2xl` → `text-xl` → `text-lg` → `text-base`
- **正文**：`text-base` (16px) 起步，`leading-relaxed`
- **等宽字体**（代码/数据）：`font-mono`，用于 Cypher 查询、数据 ID 展示
- **字重层次**：`font-bold`（标题）→ `font-semibold`（子标题）→ `font-normal`（正文）→ `font-light`（辅助）

## 3. 组件设计规范

### 3.1 卡片组件
```tsx
// 标准数据卡片模式
<div className="bg-[#1a1b2e] rounded-xl border border-[#2d3150] p-6 
                hover:border-[#6366f1]/30 transition-all duration-300">
  <h3 className="text-lg font-semibold text-[#e2e8f0] mb-2">标题</h3>
  <p className="text-[#94a3b8] text-sm">描述内容</p>
</div>
```

### 3.2 按钮层级
- **主按钮**：`bg-[#6366f1] hover:bg-[#818cf8] text-white px-4 py-2 rounded-lg transition-colors`
- **次按钮**：`border border-[#2d3150] hover:border-[#6366f1] text-[#e2e8f0] px-4 py-2 rounded-lg`
- **图标按钮**：`p-2 rounded-lg hover:bg-[#2d3150]/50 transition-colors`
- **禁用状态**：`opacity-50 cursor-not-allowed`

### 3.3 输入框
```tsx
<input className="w-full bg-[#0f1117] border border-[#2d3150] rounded-lg px-4 py-2
                   text-[#e2e8f0] placeholder:text-[#64748b]
                   focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]/30
                   transition-colors" />
```

### 3.4 过渡与动画
- **悬停过渡**：`transition-all duration-200` 或 `duration-300`
- **入场动画**：使用 CSS `@keyframes` + `animate-` 类
- **骨架屏**：使用 `animate-pulse` + `bg-[#2d3150]/50`
- **避免**：动画 `width`/`height`/`margin`（用 `transform` 和 `opacity` 代替，利用 GPU 硬件加速）

## 4. 移动端与可访问性

### 响应式断点策略
```
移动端（默认）→ sm: 640px → md: 768px → lg: 1024px → xl: 1280px
```
- 移动端优先设计，然后用 `md:`、`lg:` 逐步增强
- 侧边栏/面板在移动端使用全屏切换模式（参考 `App.tsx` 的 `isMobile` 逻辑）
- 触控目标最小 44x44px

### 可访问性检查清单
- [ ] 所有交互元素有 `focus:ring` 焦点指示
- [ ] 图标按钮有 `aria-label` 属性
- [ ] 颜色不是传达信息的唯一方式
- [ ] 视频/动画尊重 `prefers-reduced-motion`

## 5. 图谱可视化专属设计

针对 Cytoscape.js 图谱组件（`GraphPanel.tsx`）的设计规范：

- **节点颜色映射**：使用 `NODE_TYPE_COLOR` 定义的语义色（琥珀=需求、蓝=大纲、紫=文本、绿=任务、红=项目）
- **边样式**：`#3d4474` 半透明连线，带箭头指示方向
- **选中态**：白色边框高亮 + 半透明覆盖层
- **布局**：dagre 分层布局，从上到下展示追溯链路
- **节点详情**：侧边/底部抽屉式面板，显示完整属性信息

## 6. 迭代提升法

当需要提升界面品质时，按以下优先级迭代：

1. **间距对齐**：检查 padding/margin 是否使用一致的间距尺度（4 的倍数）
2. **配色协调**：确保颜色来自统一的主题变量，不超过 3 个强调色
3. **状态完整**：为所有交互元素补充 hover/focus/disabled/active 状态
4. **过渡润色**：添加 `transition` 使交互更流畅
5. **暗角/微纹理**：使用微妙的渐变或噪点纹理去除"数字感"（参考 `premium-frontend-ui` 的 Atmospheric Filters）

## 参考来源

本 Skill 灵感来源于 GitHub Awesome Copilot 社区中的 [premium-frontend-ui](https://github.com/github/awesome-copilot/tree/main/skills/premium-frontend-ui) 技能，并针对 React + TailwindCSS 技术栈进行了适配。
