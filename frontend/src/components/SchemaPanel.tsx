import { useEffect, useRef, useState, useCallback } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import { ChevronDown, ChevronUp, Database, Plus, RefreshCw } from 'lucide-react'
import type { SchemaData, SchemaNodeDef, Condition } from '../types'
import { getNodeColor, NODE_TYPE_LABEL } from '../types'

cytoscape.use(dagre)

interface Props {
  schema: SchemaData | null
  loading: boolean
  error: string | null
  onAddCondition: (condition: Omit<Condition, 'id'>) => void
  onRetry: () => void
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCHEMA_STYLE: any[] = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      label: 'data(label)',
      color: '#e2e8f0',
      'font-size': 10,
      'font-weight': 600,
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '70px',
      width: 52,
      height: 52,
      'border-width': 2,
      'border-color': 'transparent',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 2.5,
      'border-color': '#ffffff',
      'overlay-opacity': 0.08,
      'overlay-color': '#ffffff',
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
      'font-size': 8,
      color: '#64748b',
      'text-background-color': 'var(--color-bg-primary, #0f1117)',
      'text-background-opacity': 1,
      'text-background-padding': '2px',
    },
  },
]

export default function SchemaPanel({ schema, loading, error, onAddCondition, onRetry }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [selectedNode, setSelectedNode] = useState<SchemaNodeDef | null>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  const handleCyInit = useCallback((cy: cytoscape.Core) => {
    cyRef.current = cy
    cy.on('tap', 'node', evt => {
      const raw = evt.target.data('raw') as SchemaNodeDef
      setSelectedNode(raw)
    })
    cy.on('tap', evt => {
      if (evt.target === cy) setSelectedNode(null)
    })
  }, [])

  // Re-fit when expanded
  useEffect(() => {
    if (expanded) setTimeout(() => cyRef.current?.fit(undefined, 24), 50)
  }, [expanded])

  const nodeCount = schema?.nodes.length ?? 0
  const relCount = schema?.relationships.length ?? 0

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-bg-hover)]/50 transition-colors"
      >
        <Database size={13} className="text-indigo-400 shrink-0" />
        <span className="text-xs font-semibold text-[var(--color-text-secondary)] flex-1 text-left tracking-wide">
          数据库结构
        </span>
        {schema && !loading && (
          <span className="text-[10px] text-[var(--color-text-dim)]">
            {nodeCount} 节点类型 · {relCount} 关系
          </span>
        )}
        {loading && <span className="text-[10px] text-[var(--color-text-dim)]">加载中…</span>}
        {error && !loading && (
          <button
            onClick={e => { e.stopPropagation(); onRetry() }}
            className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <RefreshCw size={10} /> 重试
          </button>
        )}
        {expanded ? <ChevronUp size={13} className="text-[var(--color-text-dim)]" /> : <ChevronDown size={13} className="text-[var(--color-text-dim)]" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="animate-fade-in">
          {/* Mini schema graph */}
          {schema && schema.nodes.length > 0 && (
            <div style={{ height: 180 }} className="relative">
              <CytoscapeComponent
                elements={buildSchemaElements(schema)}
                style={{ width: '100%', height: '100%', background: 'transparent' }}
                stylesheet={SCHEMA_STYLE}
                layout={{
                  name: 'dagre',
                  rankDir: 'LR',
                  nodeSep: 30,
                  rankSep: 60,
                  padding: 20,
                } as unknown as cytoscape.LayoutOptions}
                cy={handleCyInit}
              />
            </div>
          )}

          {/* Selected node property list */}
          {selectedNode && (
            <div className="border-t border-[var(--color-border)] px-4 py-3 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: getNodeColor(selectedNode.label) }}
                />
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {NODE_TYPE_LABEL[selectedNode.label] ?? selectedNode.label}
                </span>
                <span className="text-[10px] text-[var(--color-text-dim)]">({selectedNode.label})</span>
                <button
                  onClick={() => onAddCondition({ nodeType: selectedNode.label })}
                  className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all hover:opacity-80"
                  style={{
                    borderColor: `${getNodeColor(selectedNode.label)}40`,
                    color: getNodeColor(selectedNode.label),
                    background: `${getNodeColor(selectedNode.label)}10`,
                  }}
                  title="将此节点类型加入查询条件"
                >
                  <Plus size={9} /> 选择类型
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedNode.properties.map(prop => (
                  <button
                    key={prop}
                    onClick={() => onAddCondition({ nodeType: selectedNode.label, property: prop })}
                    className="text-[11px] px-2.5 py-1 rounded-lg border transition-all hover:opacity-80 flex items-center gap-1"
                    style={{
                      borderColor: `${getNodeColor(selectedNode.label)}30`,
                      color: getNodeColor(selectedNode.label),
                      background: `${getNodeColor(selectedNode.label)}08`,
                    }}
                    title={`将 ${prop} 字段加入查询条件`}
                  >
                    <Plus size={8} className="opacity-60" />
                    {prop}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 text-xs text-red-400">{error}</div>
          )}
          {!schema && !loading && !error && (
            <div className="px-4 py-3 text-xs text-[var(--color-text-dim)]">
              请在设置中配置代理服务地址以加载数据库结构
            </div>
          )}
        </div>
      )}
    </div>
  )
}
