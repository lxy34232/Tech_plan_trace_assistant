import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import ChatPanel from './components/ChatPanel'
import GraphPanel from './components/GraphPanel'
import ConfigModal from './components/ConfigModal'
import type { AppConfig, GraphData } from './types'
import { DEFAULT_CONFIG } from './types'

const CONFIG_KEY = 'doors_trace_config'

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

export default function App() {
  const [config, setConfig] = useState<AppConfig>(loadConfig)
  const [showConfig, setShowConfig] = useState(false)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'graph'>('chat')
  const [isMobile, setIsMobile] = useState(false)

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

  const handleShowGraph = useCallback(() => {
    if (isMobile) setActiveTab('graph')
  }, [isMobile])

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
            {activeTab === 'chat' ? (
              <ChatPanel config={config} onGraphData={handleGraphData} onShowGraph={handleShowGraph} />
            ) : (
              <GraphPanel graphData={graphData} />
            )}
          </div>
        ) : (
          <>
            <div className="w-[480px] min-w-[360px] max-w-[50%] border-r border-[#2d3150] flex flex-col min-h-0">
              <ChatPanel config={config} onGraphData={handleGraphData} onShowGraph={handleShowGraph} />
            </div>
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <GraphPanel graphData={graphData} />
            </div>
          </>
        )}
      </main>

      {showConfig && (
        <ConfigModal config={config} onSave={handleSaveConfig} onClose={() => setShowConfig(false)} />
      )}
    </div>
  )
}
