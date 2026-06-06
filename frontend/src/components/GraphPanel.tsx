import { useEffect, useRef, useState, useCallback } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import type { GraphData, GraphNode } from '../types'
import { NODE_TYPE_COLOR, NODE_TYPE_LABEL, RELATION_TYPE_LABEL } from '../types'
import NodeDetail from './NodeDetail'
import { ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react'

cytoscape.use(dagre)

interface Props {
  graphData: GraphData | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CY_STYLE: any[] = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      label: 'data(label)',
      color: '#e2e8f0',
      'font-size': 11,
      'text-wrap': 'ellipsis',
      'text-max-width': '100px',
      'text-valign': 'bottom',
      'text-margin-y': 4,
      width: 40,
      height: 40,
      'border-width': 2,
      'border-color': 'data(borderColor)',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': '#ffffff',
      'overlay-color': '#ffffff',
      'overlay-opacity': 0.1,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'line-color': '#3d4474',
      'target-arrow-color': '#3d4474',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: 'data(label)',
      'font-size': 9,
      color: '#64748b',
      'text-background-color': '#0f1117',
      'text-background-opacity': 1,
      'text-background-padding': '2px',
    },
  },
  {
    selector: 'edge:selected',
    style: {
      'line-color': '#6366f1',
      'target-arrow-color': '#6366f1',
      color: '#a5b4fc',
    },
  },
]

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

export default function GraphPanel({ graphData }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [nodeCount, setNodeCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)

  useEffect(() => {
    if (!graphData) return
    setNodeCount(graphData.nodes.length)
    setEdgeCount(graphData.edges.length)
  }, [graphData])

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
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#0f1117] text-slate-600">
        <Info size={32} />
        <p className="text-sm">向 AI 提问后，追溯图谱将在此显示</p>
      </div>
    )
  }

  const elements = buildElements(graphData)

  return (
    <div className="flex flex-1 min-h-0 bg-[#0f1117]">
      {/* Graph area */}
      <div className="flex-1 relative min-w-0">
        {/* Toolbar */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          <button onClick={handleZoomIn} title="放大" className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1e2130] border border-[#2d3150] text-slate-400 hover:text-slate-200 transition-colors">
            <ZoomIn size={15} />
          </button>
          <button onClick={handleZoomOut} title="缩小" className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1e2130] border border-[#2d3150] text-slate-400 hover:text-slate-200 transition-colors">
            <ZoomOut size={15} />
          </button>
          <button onClick={handleFit} title="适应屏幕" className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1e2130] border border-[#2d3150] text-slate-400 hover:text-slate-200 transition-colors">
            <Maximize2 size={15} />
          </button>
        </div>

        {/* Stats */}
        <div className="absolute top-3 right-3 z-10 flex gap-2 text-[10px] text-slate-600">
          <span className="px-2 py-0.5 rounded-full bg-[#1e2130] border border-[#2d3150]">
            {nodeCount} 节点
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#1e2130] border border-[#2d3150]">
            {edgeCount} 关系
          </span>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 bg-[#1e2130]/90 border border-[#2d3150] rounded-xl p-2.5 backdrop-blur-sm">
          {Object.entries(NODE_TYPE_COLOR).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="text-[10px] text-slate-500">{NODE_TYPE_LABEL[type]}</span>
            </div>
          ))}
        </div>

        <CytoscapeComponent
          elements={elements}
          style={{ width: '100%', height: '100%', background: '#0f1117' }}
          stylesheet={CY_STYLE}
          layout={{
            name: 'dagre',
            rankDir: 'TB',
            nodeSep: 60,
            rankSep: 80,
            padding: 40,
          } as unknown as cytoscape.LayoutOptions}
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
