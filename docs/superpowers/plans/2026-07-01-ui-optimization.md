# UI 优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 SchemaPanel 移至右侧并支持高度调整、条件芯片支持值输入、全站应用 CRRC 中车红配色并修复 Schema 图边线可读性。

**Architecture:** 将 `schema` 和 `conditions` 状态从 `ChatPanel` 上提到 `App.tsx`，SchemaPanel 在右侧 `<main>` 容器中位于 GraphPanel 之上；ConditionBar 芯片内嵌 inline input 持有每个属性的过滤值；Tailwind v4 `@theme` 块重映射 `indigo-*` 至中车红色阶，无需改任何组件 className。

**Tech Stack:** React 18 + TypeScript 5, Tailwind CSS v4, Cytoscape.js, Vite

## Global Constraints

- 工作目录：`frontend/`，所有命令在此目录运行
- TypeScript 严格模式：每个任务完成后运行 `npx tsc --noEmit` 确认零错误
- 无现有测试套件；验证步骤为 TS 类型检查 + 开发服务器目测
- 不新增组件文件，只修改现有 6 个文件
- 不改任何组件的 `className`（配色通过 `@theme` 全局生效）
- 每任务独立 commit

---

## 文件变更地图

| 文件 | 变更内容 |
|------|---------|
| `src/index.css` | 新增 `@theme {}` 覆盖 indigo-*；更新 CSS vars |
| `src/types/index.ts` | Condition 接口新增 `value?: string` |
| `src/components/SchemaPanel.tsx` | 修复 edge 标签样式；新增高度拖拽手柄 |
| `src/App.tsx` | 上提 schema/conditions 状态；SchemaPanel 插入右侧列 |
| `src/components/ChatPanel.tsx` | 移除 schema 逻辑；接收 conditions 等为 props |
| `src/components/ConditionBar.tsx` | 属性芯片内嵌 inline value input |

---

## Task 1：CRRC 配色（index.css）

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces: Tailwind `indigo-*` 工具类全局映射为中车红；`--color-accent` 等 CSS vars 更新

- [ ] **Step 1：在 `@import "tailwindcss"` 之后插入 `@theme {}` 块**

打开 `src/index.css`，在第 1 行 `@import "tailwindcss";` 之后（第 2 行起）插入：

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

- [ ] **Step 2：更新 `:root` 块中的 CSS vars**

找到 `:root {` 块，将以下三行：
```css
  --color-accent: #6366f1;
  --color-accent-hover: #818cf8;
  --color-accent-glow: rgba(99, 102, 241, 0.15);
```
替换为：
```css
  --color-accent:       #C70019;
  --color-accent-hover: #e0001c;
  --color-accent-glow:  rgba(199, 0, 25, 0.15);
  --color-tech-blue:    #00678F;
```

- [ ] **Step 3：更新 `[data-theme="light"]` 块中的 CSS vars**

找到 `[data-theme="light"] {` 块，将：
```css
  --color-accent: #4f46e5;
  --color-accent-hover: #6366f1;
  --color-accent-glow: rgba(79, 70, 229, 0.1);
```
替换为：
```css
  --color-accent:       #C70019;
  --color-accent-hover: #a80015;
  --color-accent-glow:  rgba(199, 0, 25, 0.10);
```

- [ ] **Step 4：TypeScript 检查 + 目测**

```bash
npx tsc --noEmit
npm run dev
```

预期：零 TS 错误；打开 http://localhost:5173，所有按钮、激活态边框、焦点高亮变为中车红 `#C70019`。

- [ ] **Step 5：Commit**

```bash
git add src/index.css
git commit -m "feat: apply CRRC red brand color via Tailwind v4 @theme override"
```

---

## Task 2：Condition 接口扩展（types/index.ts）

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `Condition` 接口新增 `value?: string`，后续 Task 5、6 依赖此字段

- [ ] **Step 1：更新 Condition 接口**

找到 `src/types/index.ts` 中：
```ts
export interface Condition {
  id: string
  nodeType: string        // e.g. "TechRequirement"
  property?: string       // e.g. "priority" — absent when whole node type selected
}
```
替换为：
```ts
export interface Condition {
  id: string
  nodeType: string
  property?: string
  value?: string          // user-entered filter value, only set when property is defined
}
```

- [ ] **Step 2：TypeScript 检查**

```bash
npx tsc --noEmit
```

预期：零错误（新增可选字段不会破坏现有用法）。

- [ ] **Step 3：Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add value field to Condition interface"
```

---

## Task 3：SchemaPanel 边线可读性 + 高度拖拽（SchemaPanel.tsx）

**Files:**
- Modify: `src/components/SchemaPanel.tsx`

**Interfaces:**
- Consumes: `SchemaData`, `SchemaNodeDef`, `Condition`（来自 types），Props 接口不变
- Produces: 可拖拽高度的 SchemaPanel；边线标签清晰可读

- [ ] **Step 1：更新 `SCHEMA_STYLE` 中的 edge 样式**

找到 `SCHEMA_STYLE` 数组中的 edge selector 对象（`selector: 'edge'`），将整个对象替换为：

```ts
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'line-color': '#52587a',
      'target-arrow-color': '#52587a',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: 'data(label)',
      'font-size': 8,
      color: '#94a3b8',
      'text-background-opacity': 0,
      'text-outline-color': '#1e2130',
      'text-outline-width': 2,
      'text-outline-opacity': 0.85,
    },
  },
```

- [ ] **Step 2：在组件顶部添加 localStorage key 和 helper**

在 `export default function SchemaPanel` 之前插入：

```ts
const SCHEMA_HEIGHT_KEY = 'doors_schema_height'

function loadSchemaHeight(): number {
  try {
    const stored = localStorage.getItem(SCHEMA_HEIGHT_KEY)
    if (stored) return parseInt(stored, 10)
  } catch { /* ignore */ }
  return 200
}
```

- [ ] **Step 3：在组件内新增高度状态与拖拽逻辑**

在 `SchemaPanel` 函数体内，`const [expanded, ...]` 之后插入：

```ts
  const [graphHeight, setGraphHeight] = useState(loadSchemaHeight)
  const isDraggingHeight = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphHeightRef = useRef(graphHeight)
  graphHeightRef.current = graphHeight

  const handleHeightDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingHeight.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingHeight.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const raw = e.clientY - rect.top
      const maxH = window.innerHeight * 0.4
      const h = Math.min(Math.max(raw, 120), maxH)
      graphHeightRef.current = h
      setGraphHeight(h)
    }
    const handleMouseUp = () => {
      if (isDraggingHeight.current) {
        isDraggingHeight.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        localStorage.setItem(SCHEMA_HEIGHT_KEY, String(graphHeightRef.current))
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])
```

确保 `useRef` 已在文件顶部 import（原文件已有，无需新增）。

- [ ] **Step 4：更新 mini 图区域 JSX，绑定 ref 和动态高度，添加拖拽手柄**

找到：
```tsx
          {schema && schema.nodes.length > 0 && (
            <div style={{ height: 180 }} className="relative">
              <CytoscapeComponent
```
替换为：
```tsx
          {schema && schema.nodes.length > 0 && (
            <>
              <div ref={containerRef} style={{ height: graphHeight }} className="relative">
                <CytoscapeComponent
```

然后找到对应的关闭标签（`</div>` 关闭 `height: 180` 那个 div），替换为：
```tsx
              </div>
              {/* Height resize handle */}
              <div
                className="h-1.5 cursor-row-resize bg-transparent hover:bg-[var(--color-accent)]/20 transition-colors flex items-center justify-center group"
                onMouseDown={handleHeightDragStart}
              >
                <div className="w-8 h-0.5 rounded-full bg-[var(--color-border)] group-hover:bg-[var(--color-accent)]/50 transition-colors" />
              </div>
            </>
```

- [ ] **Step 5：TypeScript 检查 + 目测**

```bash
npx tsc --noEmit
npm run dev
```

预期：零 TS 错误；SchemaPanel 展开后边线标签文字清晰（`#94a3b8` 灰色，无黑色矩形背景）；拖拽 mini 图底部手柄可调整高度，刷新后保持。

- [ ] **Step 6：Commit**

```bash
git add src/components/SchemaPanel.tsx
git commit -m "feat: fix schema graph edge label readability and add height resize"
```

---

## Task 4：状态上提 + 右侧布局（App.tsx）

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `SchemaData`, `Condition`, `fetchSchema`（新增 import）
- Produces:
  - `schema`, `schemaLoading`, `schemaError`, `loadSchema()` — 传入 SchemaPanel
  - `conditions: Condition[]` — 传入 ChatPanel
  - `handleAddCondition(cond: Omit<Condition,'id'>): void`
  - `handleRemoveCondition(id: string): void`
  - `handleClearConditions(): void`
  - `handleUpdateConditionValue(id: string, value: string): void`

- [ ] **Step 1：替换 App.tsx 全文**

用以下完整代码替换 `src/App.tsx`：

```tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header'
import ChatPanel from './components/ChatPanel'
import GraphPanel from './components/GraphPanel'
import SchemaPanel from './components/SchemaPanel'
import ConfigModal from './components/ConfigModal'
import type { AppConfig, GraphData, SchemaData, Condition } from './types'
import { DEFAULT_CONFIG } from './types'
import { fetchSchema } from './services/schemaClient'

const CONFIG_KEY = 'doors_trace_config'
const PANEL_WIDTH_KEY = 'doors_trace_panel_width'

function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_CONFIG
}

function saveConfig(config: AppConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

function loadPanelWidth(): number {
  try {
    const stored = localStorage.getItem(PANEL_WIDTH_KEY)
    if (stored) return parseInt(stored, 10)
  } catch { /* ignore */ }
  return 480
}

function savePanelWidth(width: number) {
  localStorage.setItem(PANEL_WIDTH_KEY, String(width))
}

export default function App() {
  const [config, setConfig] = useState<AppConfig>(loadConfig)
  const [showConfig, setShowConfig] = useState(false)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'graph'>('chat')
  const [isMobile, setIsMobile] = useState(false)
  const [panelWidth, setPanelWidth] = useState(loadPanelWidth)
  const isResizing = useRef(false)

  // Schema state (lifted from ChatPanel)
  const [schema, setSchema] = useState<SchemaData | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaError, setSchemaError] = useState<string | null>(null)

  // Conditions state (lifted from ChatPanel)
  const [conditions, setConditions] = useState<Condition[]>([])

  const loadSchema = useCallback(async () => {
    if (!config.proxyUrl) return
    setSchemaLoading(true)
    setSchemaError(null)
    try {
      const data = await fetchSchema(config.proxyUrl, config.proxyApiKey)
      setSchema(data)
    } catch (e) {
      setSchemaError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setSchemaLoading(false)
    }
  }, [config.proxyUrl, config.proxyApiKey])

  useEffect(() => { loadSchema() }, [loadSchema])

  const handleAddCondition = useCallback((cond: Omit<Condition, 'id'>) => {
    setConditions(prev => {
      const duplicate = prev.some(c => c.nodeType === cond.nodeType && c.property === cond.property)
      if (duplicate) return prev
      return [...prev, { ...cond, id: crypto.randomUUID() }]
    })
  }, [])

  const handleRemoveCondition = useCallback((id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id))
  }, [])

  const handleClearConditions = useCallback(() => setConditions([]), [])

  const handleUpdateConditionValue = useCallback((id: string, value: string) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, value } : c))
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!config.difyApiKey) setShowConfig(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveConfig = useCallback((c: AppConfig) => {
    setConfig(c)
    saveConfig(c)
  }, [])

  const handleGraphData = useCallback((data: GraphData) => {
    setGraphData(data)
    if (isMobile) setActiveTab('graph')
  }, [isMobile])

  const handleShowGraph = useCallback((data?: GraphData) => {
    if (data) setGraphData(data)
    if (isMobile) setActiveTab('graph')
  }, [isMobile])

  const handleResizeStart = useCallback(() => {
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const minWidth = 320
      const maxWidth = window.innerWidth * 0.55
      const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth)
      setPanelWidth(newWidth)
    }
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        savePanelWidth(panelWidth)
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [panelWidth])

  const chatPanel = (
    <ChatPanel
      config={config}
      conditions={conditions}
      onRemoveCondition={handleRemoveCondition}
      onClearConditions={handleClearConditions}
      onUpdateConditionValue={handleUpdateConditionValue}
      onGraphData={handleGraphData}
      onShowGraph={handleShowGraph}
    />
  )

  const rightColumn = (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <SchemaPanel
        schema={schema}
        loading={schemaLoading}
        error={schemaError}
        onAddCondition={handleAddCondition}
        onRetry={loadSchema}
      />
      <GraphPanel graphData={graphData} />
    </div>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenConfig={() => setShowConfig(true)}
        isMobile={isMobile}
      />

      <main className="flex flex-1 min-h-0 overflow-hidden">
        {isMobile ? (
          <div className="flex-1 min-h-0">
            {activeTab === 'chat' ? chatPanel : rightColumn}
          </div>
        ) : (
          <>
            <div className="flex flex-col min-h-0 border-r border-[var(--color-border)]" style={{ width: panelWidth, minWidth: 320, maxWidth: '55%' }}>
              {chatPanel}
            </div>
            <div
              className="w-1.5 cursor-col-resize bg-transparent hover:bg-[var(--color-accent)]/40 active:bg-[var(--color-accent)]/60 transition-colors duration-150 shrink-0 relative group"
              onMouseDown={handleResizeStart}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-[var(--color-border-light)] group-hover:bg-[var(--color-accent)] group-active:bg-[var(--color-accent-hover)] transition-colors duration-150" />
            </div>
            {rightColumn}
          </>
        )}
      </main>

      {showConfig && (
        <ConfigModal config={config} onSave={handleSaveConfig} onClose={() => setShowConfig(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2：TypeScript 检查（预期有 ChatPanel 类型错误，Task 5 修复）**

```bash
npx tsc --noEmit
```

预期：ChatPanel 相关类型错误（因为 ChatPanel 的 Props 接口还未更新）。这是正常的，Task 5 会修复。

- [ ] **Step 3：Commit**

```bash
git add src/App.tsx
git commit -m "feat: lift schema/conditions to App and move SchemaPanel to right column"
```

---

## Task 5：ChatPanel props 重构（ChatPanel.tsx）

**Files:**
- Modify: `src/components/ChatPanel.tsx`

**Interfaces:**
- Consumes（新 Props）:
  ```ts
  config: AppConfig
  conditions: Condition[]
  onRemoveCondition: (id: string) => void
  onClearConditions: () => void
  onUpdateConditionValue: (id: string, value: string) => void
  onGraphData: (data: GraphData) => void
  onShowGraph: (data?: GraphData) => void
  ```
- Produces: 无新 export，ConditionBar 收到 `onUpdateValue` 回调

- [ ] **Step 1：替换 ChatPanel.tsx 全文**

用以下完整代码替换 `src/components/ChatPanel.tsx`：

```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { SendHorizonal, RotateCcw, BookOpen } from 'lucide-react'
import type { Message, AppConfig, GraphData, Condition } from '../types'
import { NODE_TYPE_LABEL } from '../types'
import { sendChatMessage } from '../services/difyClient'
import { parseAssistantResponse } from '../utils/responseParser'
import MessageBubble from './MessageBubble'
import ConditionBar from './ConditionBar'

interface Props {
  config: AppConfig
  conditions: Condition[]
  onRemoveCondition: (id: string) => void
  onClearConditions: () => void
  onUpdateConditionValue: (id: string, value: string) => void
  onGraphData: (data: GraphData) => void
  onShowGraph: (data?: GraphData) => void
}

const SUGGESTED = [
  '查询所有高优先级的科技规划需求',
  '需求"XXX"向下追溯到哪些科研项目？',
  '查询规划中有关高速重载机车的相关内容',
  '大纲包含哪些文本？每个文本规定了哪些需求？',
]

export default function ChatPanel({
  config,
  conditions,
  onRemoveCondition,
  onClearConditions,
  onUpdateConditionValue,
  onGraphData,
  onShowGraph,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [cypherModal, setCypherModal] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(
    async (text: string) => {
      const query = text.trim()
      if (!query || isLoading) return

      let finalQuery = query
      if (conditions.length > 0) {
        const condStr = conditions
          .map(c => {
            const nodeLabel = NODE_TYPE_LABEL[c.nodeType] ?? c.nodeType
            if (!c.property) return nodeLabel
            if (c.value) return `${nodeLabel}(${c.property}="${c.value}")`
            return `${nodeLabel}(${c.property})`
          })
          .join('、')
        finalQuery = `【查询条件：${condStr}】${query}`
      }
      onClearConditions()

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: finalQuery,
        displayContent: finalQuery,
        timestamp: new Date(),
      }

      const assistantId = crypto.randomUUID()
      const loadingMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        displayContent: '',
        timestamp: new Date(),
        loading: true,
      }

      setMessages(prev => [...prev, userMsg, loadingMsg])
      setInput('')
      setIsLoading(true)

      let accumulated = ''
      let thinkingAccumulated = ''

      await sendChatMessage(config, finalQuery, conversationId, {
        onToken: (token) => {
          accumulated += token
          const { displayContent } = parseAssistantResponse(accumulated)
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, loading: false, content: accumulated, displayContent }
                : m,
            ),
          )
        },
        onThinking: (thinking) => {
          thinkingAccumulated += (thinkingAccumulated ? '\n\n' : '') + thinking
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, thinking: thinkingAccumulated }
                : m,
            ),
          )
        },
        onDone: (convId) => {
          if (convId) setConversationId(convId)
          const { displayContent, graphData, cypher, queryResult } = parseAssistantResponse(accumulated)
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, loading: false, content: accumulated, displayContent, graphData, cypher, queryResult, thinking: thinkingAccumulated || undefined }
                : m,
            ),
          )
          if (graphData && graphData.nodes.length > 0) {
            onGraphData(graphData)
          }
          setIsLoading(false)
        },
        onError: (error) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, loading: false, displayContent: error, error: true }
                : m,
            ),
          )
          setIsLoading(false)
        },
      })
    },
    [config, conversationId, isLoading, conditions, onClearConditions, onGraphData],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const handleReset = () => {
    setMessages([])
    setConversationId(null)
    setInput('')
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
            <div className="text-center animate-fade-in">
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-700/20 border border-indigo-500/20 flex items-center justify-center animate-pulse-glow">
                  <BookOpen className="text-indigo-400" size={30} />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-indigo-500/5 blur-xl -z-10" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1.5 tracking-tight">DOORS 追溯问答</h2>
              <p className="text-sm text-[var(--color-text-muted)]">用自然语言查询科技规划数据库，支持全链路追溯分析</p>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full max-w-md">
              {SUGGESTED.map((s, i) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className={`text-left text-sm px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-indigo-500/40 hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-all duration-200 animate-fade-in-up group`}
                  style={{ animationDelay: `${i * 0.08 + 0.1}s` }}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                      <span className="text-[10px] text-indigo-400 font-medium">{i + 1}</span>
                    </span>
                    {s}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-[var(--color-text-dim)] text-center animate-fade-in animate-delay-500">
              以上为示例问题，你也可以自由输入任何追溯查询
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onShowCypher={setCypherModal}
              onShowGraph={msg.graphData ? () => onShowGraph(msg.graphData) : undefined}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Condition chips */}
      <ConditionBar
        conditions={conditions}
        onRemove={onRemoveCondition}
        onClear={onClearConditions}
        onUpdateValue={onUpdateConditionValue}
      />

      {/* Input area */}
      <div className="border-t border-[var(--color-border)] p-4 bg-gradient-to-t from-[var(--color-bg-primary)] to-transparent">
        <div className="flex gap-2 items-end bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl px-4 py-2.5 focus-within:border-indigo-500/50 focus-within:shadow-lg focus-within:shadow-indigo-500/5 transition-all duration-300">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题，Enter 发送，Shift+Enter 换行…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dim)] resize-none outline-none py-1 max-h-32"
            style={{ lineHeight: '1.5rem' }}
            disabled={isLoading}
          />
          <div className="flex gap-1.5 items-center pb-0.5">
            <button
              onClick={handleReset}
              title="清空对话"
              className="p-1.5 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:bg-slate-700/50 transition-all duration-200"
              aria-label="清空对话"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isLoading}
              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm shadow-indigo-600/30"
              aria-label="发送消息"
            >
              <SendHorizonal size={15} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-[var(--color-text-dim)] text-center mt-2 tracking-wide">
          AI 生成内容仅供参考，请以数据库原始数据为准
        </p>
      </div>

      {/* Cypher modal */}
      {cypherModal && (
        <div
          className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setCypherModal(null)}
        >
          <div
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl shadow-[var(--color-shadow)] animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-text-emphasis)]">执行的 Cypher 查询</h3>
              <button onClick={() => setCypherModal(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-lg leading-none">×</button>
            </div>
            <pre className="text-xs text-emerald-300 bg-[var(--color-bg-code)] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono">
              {cypherModal}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2：TypeScript 检查（预期 ConditionBar 类型错误，Task 6 修复）**

```bash
npx tsc --noEmit
```

预期：`ConditionBar` 的 `onUpdateValue` prop 尚未定义，有 1 个类型错误。ChatPanel 本身的类型应已通过。

- [ ] **Step 3：Commit**

```bash
git add src/components/ChatPanel.tsx
git commit -m "feat: refactor ChatPanel to accept conditions as props, update condition string format"
```

---

## Task 6：ConditionBar 内嵌值输入（ConditionBar.tsx）

**Files:**
- Modify: `src/components/ConditionBar.tsx`

**Interfaces:**
- Consumes（新增 prop）: `onUpdateValue: (id: string, value: string) => void`
- Produces: 属性芯片右侧显示 `= [inline input]`，input onChange 调用 `onUpdateValue`

- [ ] **Step 1：替换 ConditionBar.tsx 全文**

用以下完整代码替换 `src/components/ConditionBar.tsx`：

```tsx
import { X, Filter } from 'lucide-react'
import type { Condition } from '../types'
import { getNodeColor, NODE_TYPE_LABEL } from '../types'

interface Props {
  conditions: Condition[]
  onRemove: (id: string) => void
  onClear: () => void
  onUpdateValue: (id: string, value: string) => void
}

export default function ConditionBar({ conditions, onRemove, onClear, onUpdateValue }: Props) {
  if (conditions.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 flex-wrap animate-fade-in">
      <Filter size={12} className="text-[var(--color-text-muted)] shrink-0" />
      <div className="flex gap-1.5 flex-wrap flex-1 min-w-0">
        {conditions.map(c => {
          const color = getNodeColor(c.nodeType)
          const nodeLabel = NODE_TYPE_LABEL[c.nodeType] ?? c.nodeType
          return (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all animate-fade-in"
              style={{
                background: `${color}15`,
                borderColor: `${color}40`,
                color,
              }}
            >
              {c.property ? `${nodeLabel} · ${c.property}` : nodeLabel}
              {c.property && (
                <>
                  <span className="opacity-50 mx-0.5">=</span>
                  <input
                    type="text"
                    value={c.value ?? ''}
                    onChange={e => onUpdateValue(c.id, e.target.value)}
                    placeholder="值…"
                    className="bg-transparent outline-none border-b border-current/30 focus:border-current/70 transition-colors text-xs placeholder-current/40"
                    style={{
                      color: 'inherit',
                      minWidth: '40px',
                      width: `${Math.max(40, (c.value?.length ?? 0) * 7 + 20)}px`,
                    }}
                  />
                </>
              )}
              <button
                onClick={() => onRemove(c.id)}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity rounded-full"
                aria-label="移除条件"
              >
                <X size={10} />
              </button>
            </span>
          )
        })}
      </div>
      <button
        onClick={onClear}
        className="text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)] transition-colors shrink-0"
      >
        清除全部
      </button>
    </div>
  )
}
```

- [ ] **Step 2：TypeScript 全量检查**

```bash
npx tsc --noEmit
```

预期：**零错误**。所有 6 个文件的类型链应已完整。

- [ ] **Step 3：构建验证**

```bash
npm run build
```

预期：构建成功，无警告（除已有的 `any[]` 类型警告外）。

- [ ] **Step 4：端到端目测验证**

```bash
npm run dev
```

打开 http://localhost:5173，逐项验证：

1. **配色**：按钮、激活边框、焦点高亮均为中车红 `#C70019`
2. **右侧 Schema 面板**：SchemaPanel 位于图谱上方；边线标签清晰可读（无黑色矩形背景）
3. **高度调整**：拖拽 mini 图底部手柄，高度实时变化；刷新页面后高度保持
4. **条件芯片值**：在 SchemaPanel 点击节点属性 → 芯片带 `= [___]` 输入框 → 输入文字后宽度自适应
5. **发送条件**：带多个属性值的芯片，发送后消息内容包含 `【查询条件：大纲(title="xxx")】`
6. **移动端**：切换 graph tab 可见 SchemaPanel + 图谱；切 chat tab 可见聊天 + ConditionBar

- [ ] **Step 5：Commit**

```bash
git add src/components/ConditionBar.tsx
git commit -m "feat: add inline value input to condition chips in ConditionBar"
```

- [ ] **Step 6：推送并触发 GitHub Actions 部署**

```bash
git push origin main
```

等待 GitHub Actions 构建完成（约 2 分钟），验证 GitHub Pages 线上版本正常。

---

## 自审结果

- **Spec 覆盖**：布局重构 ✓（Task 4）；SchemaPanel 高度拖拽 ✓（Task 3）；条件值输入 ✓（Task 6）；handleSend 条件字符串格式 ✓（Task 5）；CRRC 配色 ✓（Task 1）；edge 可读性 ✓（Task 3）
- **无占位符**：所有步骤含完整代码
- **类型一致性**：`Condition.value` 在 Task 2 定义，Task 5/6 使用；`onUpdateValue` 在 Task 6 Props 中定义，Task 5 传入
- **任务顺序**：Task 1（CSS）→ Task 2（类型）→ Task 3（SchemaPanel）→ Task 4（App）→ Task 5（ChatPanel）→ Task 6（ConditionBar），依赖链单向
