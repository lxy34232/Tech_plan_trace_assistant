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
    <div className="flex-1 flex min-h-0 min-w-0">
      <GraphPanel graphData={graphData} />
      <SchemaPanel
        schema={schema}
        loading={schemaLoading}
        error={schemaError}
        onAddCondition={handleAddCondition}
        onRetry={loadSchema}
        defaultExpanded={!isMobile}
      />
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
