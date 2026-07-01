import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import { Database, Plus, RefreshCw, ZoomIn, ZoomOut, Maximize2, ChevronRight, ChevronLeft } from 'lucide-react'
import type { SchemaData, SchemaNodeDef, Condition } from '../types'
import { getNodeColor, NODE_TYPE_LABEL } from '../types'
import { useTheme } from '../contexts/ThemeContext'

cytoscape.use(dagre)

interface Props {
  schema: SchemaData | null
  loading: boolean
  error: string | null
  onAddCondition: (condition: Omit<Condition, 'id'>) => void
  onRetry: () => void
  defaultExpanded?: boolean
}

function buildSchemaStyle(isDark: boolean) {
  const edgeColor = isDark ? '#4d5780' : '#8094b0'
  const edgeLabelColor = isDark ? '#94a3b8' : '#475569'
  const edgeLabelBg = isDark ? '#0f1117' : '#f8fafc'
  const selectedBorder = isDark ? '#ffffff' : '#1e293b'

  return [
    {
      selector: 'node',
      style: {
        shape: 'roundrectangle',
        'corner-radius': 6,
        'background-color': 'data(color)',
        'background-opacity': 0.9,
        label: 'data(label)',
        color: '#ffffff',
        'font-size': 10,
        'font-weight': 400,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '80px',
        width: 'label',
        height: 'label',
        padding: 10,
        'text-outline-color': 'rgba(0,0,0,0.4)',
        'text-outline-width': 1,
        'text-outline-opacity': 0.5,
        'border-width': 1,
        'border-color': 'data(borderColor)',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 2,
        'border-color': selectedBorder,
        'overlay-color': selectedBorder,
        'overlay-opacity': 0.1,
        'overlay-padding': 3,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.2,
        'line-color': edgeColor,
        'target-arrow-color': edgeColor,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': 8,
        'font-weight': 400,
        color: edgeLabelColor,
        'text-rotation': 'autorotate',
        'text-margin-y': -6,
        'text-background-color': edgeLabelBg,
        'text-background-opacity': 0.88,
        'text-background-padding': '2px',
        'text-background-shape': 'roundrectangle',
      },
    },
  ]
}

function buildSchemaElements(schema: SchemaData): cytoscape.ElementDefinition[] {
  const elements: cytoscape.ElementDefinition[] = []

  for (const node of schema.nodes) {
    const color = getNodeColor(node.label)
    elements.push({
      data: {
        id: node.label,
        label: NODE_TYPE_LABEL[node.label] ?? node.label,
        color,
        borderColor: color + 'aa',
        raw: node,
      },
    })
  }

  const seen = new Set<string>()
  for (const rel of schema.relationships) {
    const key = `${rel.from}_${rel.type}_${rel.to}`
    if (seen.has(key) || !rel.from || !rel.to) continue
    seen.add(key)
    elements.push({
      data: {
        id: key,
        source: rel.from,
        target: rel.to,
        label: rel.type.replace(/_/g, ' '),
      },
    })
  }

  return elements
}

export default function SchemaPanel({
  schema, loading, error, onAddCondition, onRetry, defaultExpanded = true,
}: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const schemaStyle = useMemo(() => buildSchemaStyle(isDark), [isDark])

  const [expanded, setExpanded] = useState(defaultExpanded)
  const [selectedNode, setSelectedNode] = useState<SchemaNodeDef | null>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  // Update Cytoscape styles when theme changes
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cy.style().fromJson(schemaStyle as any).update()
  }, [schemaStyle])

  // Re-fit when expanded
  useEffect(() => {
    if (expanded) setTimeout(() => cyRef.current?.fit(undefined, 20), 80)
  }, [expanded])

  const handleCyInit = useCallback((cy: cytoscape.Core) => {
    cyRef.current = cy
    cy.on('tap', 'node', evt => {
      setSelectedNode(evt.target.data('raw') as SchemaNodeDef)
    })
    cy.on('tap', evt => {
      if (evt.target === cy) setSelectedNode(null)
    })
  }, [])

  const handleZoomIn = () => { const cy = cyRef.current; if (cy) cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }) }
  const handleZoomOut = () => { const cy = cyRef.current; if (cy) cy.zoom({ level: cy.zoom() * 0.77, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }) }
  const handleFit = () => cyRef.current?.fit(undefined, 20)

  const nodeCount = schema?.nodes.length ?? 0
  const relCount = schema?.relationships.length ?? 0

  // Collapsed state — narrow strip
  if (!expanded) {
    return (
      <div className="w-8 shrink-0 flex flex-col items-center border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40">
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-center py-2.5 hover:bg-[var(--color-bg-hover)]/50 transition-colors border-b border-[var(--color-border)]"
          title="展开数据库结构"
        >
          <ChevronLeft size={13} className="text-[var(--color-text-dim)]" />
        </button>
        <div
          className="mt-4 text-[10px] text-[var(--color-text-dim)] select-none tracking-widest"
          style={{ writingMode: 'vertical-rl' }}
        >
          数据库结构
        </div>
      </div>
    )
  }

  return (
    <div className="w-60 shrink-0 flex flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <Database size={12} className="text-indigo-400 shrink-0" />
        <span className="text-xs font-medium text-[var(--color-text-secondary)] flex-1 tracking-wide">数据库结构</span>
        {schema && !loading && (
          <span className="text-[10px] text-[var(--color-text-dim)] shrink-0">
            {nodeCount}·{relCount}
          </span>
        )}
        {loading && <RefreshCw size={10} className="text-[var(--color-text-dim)] animate-spin shrink-0" />}
        {error && !loading && (
          <button onClick={onRetry} className="text-[10px] text-red-400 hover:text-red-300 transition-colors shrink-0" title="重试">
            <RefreshCw size={10} />
          </button>
        )}
        <button
          onClick={() => setExpanded(false)}
          className="shrink-0 text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] transition-colors"
          title="折叠"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Controls */}
      {schema && schema.nodes.length > 0 && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-[var(--color-border)] shrink-0">
          <button
            onClick={handleZoomIn}
            title="放大"
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-all"
          >
            <ZoomIn size={11} />
          </button>
          <button
            onClick={handleZoomOut}
            title="缩小"
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-all"
          >
            <ZoomOut size={11} />
          </button>
          <button
            onClick={handleFit}
            title="适应画面"
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-all"
          >
            <Maximize2 size={11} />
          </button>
        </div>
      )}

      {/* Mini graph */}
      {schema && schema.nodes.length > 0 && (
        <div className="flex-1 min-h-0 relative">
          <CytoscapeComponent
            elements={buildSchemaElements(schema)}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
            stylesheet={schemaStyle as unknown as cytoscape.StylesheetCSS[]}
            layout={{
              name: 'dagre',
              rankDir: 'TB',
              nodeSep: 40,
              rankSep: 110,
              padding: 20,
            } as unknown as cytoscape.LayoutOptions}
            cy={handleCyInit}
          />
        </div>
      )}

      {/* State messages */}
      {error && (
        <div className="px-3 py-2 text-xs text-red-400 shrink-0">{error}</div>
      )}
      {!schema && !loading && !error && (
        <div className="px-3 py-3 text-xs text-[var(--color-text-dim)] leading-relaxed">
          请在设置中配置代理服务地址以加载数据库结构
        </div>
      )}

      {/* Selected node properties */}
      {selectedNode && (
        <div className="border-t border-[var(--color-border)] px-3 py-2.5 shrink-0 max-h-52 overflow-y-auto animate-fade-in">
          <div className="flex items-center gap-1.5 mb-2">
            <div
              className="w-2 h-2 rounded-sm shrink-0"
              style={{ background: getNodeColor(selectedNode.label) }}
            />
            <span className="text-[11px] font-medium text-[var(--color-text-primary)] flex-1 min-w-0 truncate">
              {NODE_TYPE_LABEL[selectedNode.label] ?? selectedNode.label}
            </span>
            <button
              onClick={() => onAddCondition({ nodeType: selectedNode.label })}
              className="shrink-0 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border transition-all hover:opacity-80"
              style={{
                borderColor: `${getNodeColor(selectedNode.label)}40`,
                color: getNodeColor(selectedNode.label),
                background: `${getNodeColor(selectedNode.label)}10`,
              }}
              title="将此节点类型加入查询条件"
            >
              <Plus size={8} /> 选择
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedNode.properties.map(prop => (
              <button
                key={prop}
                onClick={() => onAddCondition({ nodeType: selectedNode.label, property: prop })}
                className="text-[10px] px-2 py-0.5 rounded border transition-all hover:opacity-80 flex items-center gap-0.5"
                style={{
                  borderColor: `${getNodeColor(selectedNode.label)}30`,
                  color: getNodeColor(selectedNode.label),
                  background: `${getNodeColor(selectedNode.label)}08`,
                }}
                title={`将 ${prop} 字段加入查询条件`}
              >
                <Plus size={7} className="opacity-60" />
                {prop}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
