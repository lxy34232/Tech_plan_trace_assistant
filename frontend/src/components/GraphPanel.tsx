import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import type { GraphData, GraphNode, LayoutType } from '../types'
import { NODE_TYPE_COLOR, NODE_TYPE_LABEL, RELATION_TYPE_LABEL, LAYOUT_OPTIONS } from '../types'
import NodeDetail from './NodeDetail'
import { useTheme } from '../contexts/ThemeContext'
import { ZoomIn, ZoomOut, Maximize2, Share2, Layout } from 'lucide-react'

cytoscape.use(dagre)

interface Props {
  graphData: GraphData | null
}

/** Cytoscape styles that depend on dark/light theme */
function buildCyStyle(isDark: boolean) {
  const textColor = isDark ? '#e2e8f0' : '#1e293b'
  const textBg = isDark ? '#0f1117' : '#f8fafc'
  const edgeColor = isDark ? '#94a3b8' : '#64748b'
  const edgeLabelColor = isDark ? '#64748b' : '#475569'
  const selectedOverlay = isDark ? '#ffffff' : '#1e293b'

  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        label: 'data(label)',
        color: textColor,
        'font-size': 11,
        'text-wrap': 'ellipsis',
        'text-max-width': '110px',
        'text-valign': 'bottom',
        'text-margin-y': 6,
        'text-background-color': textBg,
        'text-background-opacity': 0.85,
        'text-background-padding': '2px',
        'text-background-shape': 'roundrectangle',
        width: 42,
        height: 42,
        'border-width': 2.5,
        'border-color': 'data(borderColor)',
        'transition-property': 'border-width, border-color',
        'transition-duration': '0.2s',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': selectedOverlay,
        'overlay-color': selectedOverlay,
        'overlay-opacity': 0.12,
        'overlay-padding': 4,
      },
    },
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 3,
        'border-color': '#a5b4fc',
        'overlay-color': '#a5b4fc',
        'overlay-opacity': 0.08,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.8,
        'line-color': edgeColor,
        'target-arrow-color': edgeColor,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': 9,
        color: edgeLabelColor,
        'text-background-color': textBg,
        'text-background-opacity': 0.9,
        'text-background-padding': '3px',
        'text-background-shape': 'roundrectangle',
        'transition-property': 'line-color, target-arrow-color, width',
        'transition-duration': '0.2s',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#6366f1',
        'target-arrow-color': '#6366f1',
        color: '#a5b4fc',
        width: 2.5,
      },
    },
    {
      selector: 'edge.highlighted',
      style: {
        'line-color': '#818cf8',
        'target-arrow-color': '#818cf8',
      },
    },
  ]
}

function buildElements(graphData: GraphData): cytoscape.ElementDefinition[] {
  const elements: cytoscape.ElementDefinition[] = []
  const nodeIds = new Set(graphData.nodes.map(n => n.id))

  for (const node of graphData.nodes) {
    const color = NODE_TYPE_COLOR[node.type] ?? '#64748b'
    const border = color + 'aa'
    elements.push({
      data: {
        id: node.id,
        label: node.label.length > 18 ? node.label.slice(0, 18) + '…' : node.label,
        color,
        borderColor: border,
        type: node.type,
        typeLabel: NODE_TYPE_LABEL[node.type] ?? node.type,
        raw: node,
      },
    })
  }

  for (const edge of graphData.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    elements.push({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: RELATION_TYPE_LABEL[edge.type] ?? edge.type,
        rawType: edge.type,
      },
    })
  }

  return elements
}

function getLayoutOptions(layout: LayoutType): cytoscape.LayoutOptions {
  switch (layout) {
    case 'dagre':
      return { name: 'dagre', rankDir: 'TB', nodeSep: 90, rankSep: 120, padding: 50 } as unknown as cytoscape.LayoutOptions
    case 'circle':
      return { name: 'circle', padding: 50, avoidOverlap: true, spacing: 20 } as unknown as cytoscape.LayoutOptions
    case 'concentric':
      return { name: 'concentric', padding: 50, concentric: (node: cytoscape.NodeSingular) => node.degree(), levelWidth: () => 2, minNodeSpacing: 50, avoidOverlap: true } as unknown as cytoscape.LayoutOptions
    case 'breadthfirst':
      return { name: 'breadthfirst', directed: true, padding: 50, spacingFactor: 1.4, avoidOverlap: true } as cytoscape.LayoutOptions
    case 'cose':
      return { name: 'cose', padding: 50, nodeRepulsion: () => 12000, idealEdgeLength: () => 130, componentSpacing: 60 } as unknown as cytoscape.LayoutOptions
    case 'grid':
      return { name: 'grid', padding: 50, avoidOverlap: true, condense: false } as unknown as cytoscape.LayoutOptions
    default:
      return { name: 'dagre', rankDir: 'TB', nodeSep: 90, rankSep: 120, padding: 50 } as unknown as cytoscape.LayoutOptions
  }
}

export default function GraphPanel({ graphData }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [nodeCount, setNodeCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)
  const [layout, setLayout] = useState<LayoutType>('dagre')
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)

  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const cyStyle = useMemo(() => buildCyStyle(isDark), [isDark])
  const canvasBg = isDark ? '#0f1117' : '#f8fafc'

  useEffect(() => {
    if (!graphData) return
    setNodeCount(graphData.nodes.length)
    setEdgeCount(graphData.edges.length)
  }, [graphData])

  // Update Cytoscape styles when theme changes
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cy.style().fromJson(cyStyle as any).update()
  }, [cyStyle])

  // Apply layout when changed or when graph data changes
  useEffect(() => {
    const cy = cyRef.current
    if (!cy || !graphData || graphData.nodes.length === 0) return
    // Wait until elements are synced into the cy instance
    if (cy.nodes().length === 0) {
      const onAdd = () => {
        cy.off('add', onAdd)
        const opts = getLayoutOptions(layout)
        cy.layout(opts).run()
      }
      cy.on('add', onAdd)
      return
    }
    const opts = getLayoutOptions(layout)
    cy.layout(opts).run()
  }, [layout, graphData])

  const handleCyInit = useCallback((cy: cytoscape.Core) => {
    cyRef.current = cy

    cy.on('tap', 'node', (evt) => {
      const raw = evt.target.data('raw') as GraphNode
      setSelectedNode(raw)
    })
    cy.on('tap', (evt) => {
      if (evt.target === cy) setSelectedNode(null)
    })
  }, [])

  const handleFit = () => cyRef.current?.fit(undefined, 40)
  const handleZoomIn = () => { const cy = cyRef.current; if (cy) cy.zoom(cy.zoom() * 1.3) }
  const handleZoomOut = () => { const cy = cyRef.current; if (cy) cy.zoom(cy.zoom() * 0.77) }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[var(--color-bg-primary)] text-[var(--color-text-dim)] animate-fade-in">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-500/10 to-slate-700/10 border border-[var(--color-border)] flex items-center justify-center">
            <Share2 size={32} className="text-[var(--color-text-dim)]" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-[var(--color-text-muted)]">追溯图谱可视化</p>
          <p className="text-xs text-[var(--color-text-dim)]">向 AI 提问后，系统将自动生成知识图谱</p>
        </div>
      </div>
    )
  }

  const elements = buildElements(graphData)

  return (
    <div className="flex flex-1 min-h-0 bg-[var(--color-bg-primary)] animate-fade-in">
      {/* Graph area */}
      <div className="flex-1 relative min-w-0">
        {/* Toolbar */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
          <button onClick={handleZoomIn} title="放大" aria-label="放大图谱" className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-bg-card)]/90 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-indigo-500/40 hover:bg-[var(--color-bg-hover)] transition-all duration-200 backdrop-blur-sm">
            <ZoomIn size={15} />
          </button>
          <button onClick={handleZoomOut} title="缩小" aria-label="缩小图谱" className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-bg-card)]/90 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-indigo-500/40 hover:bg-[var(--color-bg-hover)] transition-all duration-200 backdrop-blur-sm">
            <ZoomOut size={15} />
          </button>
          <button onClick={handleFit} title="适应屏幕" aria-label="适应屏幕" className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-bg-card)]/90 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-indigo-500/40 hover:bg-[var(--color-bg-hover)] transition-all duration-200 backdrop-blur-sm">
            <Maximize2 size={15} />
          </button>

          {/* Layout switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
              title="切换布局"
              aria-label="切换布局"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-bg-card)]/90 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-indigo-500/40 hover:bg-[var(--color-bg-hover)] transition-all duration-200 backdrop-blur-sm"
            >
              <Layout size={14} />
            </button>
            {showLayoutMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowLayoutMenu(false)} />
                <div className="absolute left-10 top-0 z-30 bg-[var(--color-bg-card)]/98 border border-[var(--color-border)] rounded-xl p-1.5 shadow-2xl shadow-[var(--color-shadow)] backdrop-blur-xl min-w-[140px] animate-scale-in origin-top-left">
                  {LAYOUT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setLayout(opt.value); setShowLayoutMenu(false) }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-all duration-150 ${
                        layout === opt.value
                          ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
                      }`}
                    >
                      <span className="text-sm w-5 text-center">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="absolute top-3 right-3 z-10 flex gap-2 text-[10px]">
          <span className="px-2.5 py-1 rounded-full bg-[var(--color-bg-card)]/90 border border-[var(--color-border)] text-[var(--color-text-secondary)] backdrop-blur-sm">
            <span className="text-indigo-400 font-semibold">{nodeCount}</span> 节点
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[var(--color-bg-card)]/90 border border-[var(--color-border)] text-[var(--color-text-secondary)] backdrop-blur-sm">
            <span className="text-indigo-400 font-semibold">{edgeCount}</span> 关系
          </span>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 bg-[var(--color-bg-card)]/95 border border-[var(--color-border)] rounded-xl p-3 backdrop-blur-md shadow-lg shadow-[var(--color-shadow)]">
          <span className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-0.5">图例</span>
          {Object.entries(NODE_TYPE_COLOR).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 group cursor-default">
              <div
                className="w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-[var(--color-bg-card)] transition-transform duration-200 group-hover:scale-125"
                style={{ background: color, boxShadow: `0 0 0 1px ${color}40` }}
              />
              <span className="text-[10px] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors">{NODE_TYPE_LABEL[type] ?? type}</span>
            </div>
          ))}
        </div>

        <CytoscapeComponent
          elements={elements}
          style={{ width: '100%', height: '100%', background: canvasBg }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stylesheet={cyStyle as any}
          layout={{ name: 'preset' } as cytoscape.LayoutOptions}
          cy={handleCyInit}
        />
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  )
}
