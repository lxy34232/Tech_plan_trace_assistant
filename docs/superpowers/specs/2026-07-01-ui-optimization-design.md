# UI 优化设计文档

**日期：** 2026-07-01  
**范围：** 布局重构、条件芯片值输入、CRRC 配色 + Schema 图可读性

---

## 一、架构与状态重构（布局优化）

### 目标
将 SchemaPanel 从左侧 ChatPanel 移至右侧可视化区域上方，解耦 schema/conditions 状态与 ChatPanel。

### 状态上提

以下状态和逻辑从 `ChatPanel` 迁移至 `App.tsx`：

| 状态/函数 | 原位置 | 新位置 |
|-----------|--------|--------|
| `schema / schemaLoading / schemaError` | ChatPanel | App.tsx |
| `loadSchema()` | ChatPanel | App.tsx（依赖 config，天然适合） |
| `conditions: Condition[]` | ChatPanel | App.tsx |
| `handleAddCondition` | ChatPanel 内部 | App.tsx |
| `handleRemoveCondition / handleClearConditions` | ChatPanel 内部 | App.tsx |

### 新组件树（桌面端）

```
App.tsx
├─ Header
├─ main
│   ├─ ChatPanel(conditions, onRemove, onClear, onGraphData, onShowGraph)
│   │   ├─ MessageList
│   │   ├─ ConditionBar        ← 保留在左侧
│   │   └─ InputArea（handleSend 读 conditions prop）
│   ├─ [水平 resize handle]
│   └─ 右侧 flex-col 容器（新增包装 div）
│       ├─ SchemaPanel(schema, loading, error, onAddCondition, onRetry)
│       │   └─ [底部高度拖拽手柄]
│       └─ GraphPanel(graphData)   ← 移除 schema 相关 props
└─ ConfigModal
```

### 移动端行为

- `activeTab === 'chat'`：显示 ChatPanel（含 ConditionBar + 输入框）
- `activeTab === 'graph'`：显示右侧容器（SchemaPanel + 图谱）
- 用户在 graph tab 点选条件，切换到 chat tab 发送，流程自然

### SchemaPanel 高度可调

- 拖拽目标：SchemaPanel 内 mini 图区域的底部边缘（4px 可视拖手柄）
- 默认高度：200px（mini 图区域）
- 最小：120px；最大：右侧面板高度的 40%
- 持久化：`localStorage('doors_schema_height')`
- 属性列表区在拖拽区下方，自然高度，不受拖拽影响

---

## 二、条件芯片值输入

### 数据模型变更

`frontend/src/types/index.ts` — `Condition` 接口新增 `value` 字段：

```ts
export interface Condition {
  id: string
  nodeType: string     // e.g. "TechOutline"
  property?: string    // e.g. "title"
  value?: string       // NEW — 用户在芯片中输入的过滤值
}
```

### ConditionBar 芯片渲染规则

| 芯片类型 | 渲染形式 |
|----------|----------|
| 仅节点类型（`property` 为 undefined） | `大纲 ×` — 纯标签 |
| 节点类型 + 属性（有 `property`） | `大纲 · title = [____] ×` — 右侧嵌 inline input |

**inline input 规格：**
- 宽度弹性：`min-width: 40px`，按 `value.length * 7px` 估算，自动伸缩
- 样式：背景透明，仅底部边线，颜色继承芯片节点色
- `placeholder="值…"`
- 修改 `value` 时更新对应 Condition 的 value 字段（通过新增 `onUpdateConditionValue(id, value)` 回调）

### 发送时条件字符串格式

```
【查询条件：{条件列表}】{用户原始问题}
```

条件列表构建规则：

| 条件 | 输出 |
|------|------|
| 仅节点类型 | `需求` |
| 节点类型 + 属性，无值 | `大纲(title)` |
| 节点类型 + 属性 + 值 | `大纲(title="高速重载")` |

**完整示例：**

用户点选：`大纲(type)`、`大纲.title="高速重载"`、`大纲.content="动力学"`  
发送 "查询相关文本" →

```
【查询条件：大纲、大纲(title="高速重载")、大纲(content="动力学")】查询相关文本
```

### 新增回调

`App.tsx` 需新增 `handleUpdateConditionValue(id: string, value: string)` 并传入 `ChatPanel → ConditionBar`。

---

## 三、CRRC 配色 + Schema 图可读性

### 3.1 Tailwind v4 @theme 覆盖

`frontend/src/index.css` 中 `@import "tailwindcss"` 之后新增：

```css
@theme {
  --color-indigo-50:  #fff1f2;
  --color-indigo-100: #ffe1e3;
  --color-indigo-200: #ffbcc1;
  --color-indigo-300: #ff8590;
  --color-indigo-400: #ff4d5f;
  --color-indigo-500: #e0001c;
  --color-indigo-600: #c70019;
  --color-indigo-700: #a80015;
  --color-indigo-800: #8a0011;
  --color-indigo-900: #72000e;
  --color-indigo-950: #4a0009;
}
```

效果：所有现有 `bg-indigo-600`、`hover:bg-indigo-500`、`border-indigo-500/40`、`text-indigo-400` 等类自动使用中车红色阶，**无需改任何组件代码**。

### 3.2 CSS 变量更新

`:root` 块（dark theme）：

```css
--color-accent:       #C70019;
--color-accent-hover: #e0001c;
--color-accent-glow:  rgba(199, 0, 25, 0.15);
--color-tech-blue:    #00678F;
```

`[data-theme="light"]` 块：

```css
--color-accent:       #C70019;
--color-accent-hover: #a80015;
--color-accent-glow:  rgba(199, 0, 25, 0.10);
```

### 3.3 不变的部分

- 深色背景 `#0f1117`、`#1e2130`（已符合 CRRC 深墨调）
- 图谱节点颜色（TechRequirement 黄、TechTask 绿等）— 数据分类色
- 图谱边线颜色（灰色体系）

### 3.4 SchemaPanel mini 图可读性修复

`frontend/src/components/SchemaPanel.tsx` — `SCHEMA_STYLE` 中 edge 样式：

**修改前：**
```js
color: '#64748b',                                    // 低对比灰
'text-background-color': 'var(--color-bg-primary)', // 纯黑矩形块
'text-background-opacity': 1,
'text-background-padding': '2px',
```

**修改后：**
```js
color: '#94a3b8',            // 更亮的灰，清晰可读
'text-background-opacity': 0, // 移除黑色矩形背景
'text-outline-color': '#1e2130',  // 描边融入卡片背景
'text-outline-width': 2,
'text-outline-opacity': 0.85,
```

同时将边线颜色从 `#3d4474` 调亮至 `#52587a`，提升线条可见度。

---

## 四、受影响文件清单

| 文件 | 变更类型 |
|------|---------|
| `frontend/src/types/index.ts` | 新增 `value?: string` 到 Condition |
| `frontend/src/index.css` | 新增 `@theme {}` 块；更新 CSS vars |
| `frontend/src/App.tsx` | 上提 schema/conditions 状态；新增右侧容器 |
| `frontend/src/components/ChatPanel.tsx` | 移除 schema 逻辑；改为接收 conditions props |
| `frontend/src/components/ConditionBar.tsx` | 添加 inline value input；新增 onUpdateValue 回调 |
| `frontend/src/components/SchemaPanel.tsx` | 添加高度拖拽手柄；修复 edge 标签样式 |
共 6 个文件，无新增组件文件。GraphPanel.tsx 无需修改（它从未持有 schema 相关 props；SchemaPanel 直接在 App.tsx 右侧容器内、GraphPanel 上方插入）。
