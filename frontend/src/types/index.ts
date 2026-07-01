export interface GraphNode {
  id: string
  domain_id: string
  labels: string[]
  type: string
  label: string
  properties: Record<string, unknown>
}

export interface GraphEdge {
  id: string
  type: string
  source: string
  target: string
  properties: Record<string, unknown>
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  displayContent: string
  thinking?: string
  queryResult?: string
  graphData?: GraphData
  cypher?: string
  timestamp: Date
  loading?: boolean
  error?: boolean
}

/** 图谱布局类型 */
export type LayoutType = 'dagre' | 'circle' | 'grid'

export const LAYOUT_OPTIONS: { value: LayoutType; label: string; icon: string }[] = [
  { value: 'dagre', label: '树状布局', icon: '├─' },
  { value: 'circle', label: '环状布局', icon: '◎' },
  { value: 'grid', label: '网格布局', icon: '⊞' },
]

export interface AppConfig {
  difyApiKey: string
  difyBaseUrl: string
  proxyUrl: string
  proxyApiKey: string
}

export const DEFAULT_CONFIG: AppConfig = {
  difyApiKey: import.meta.env.VITE_DIFY_API_KEY ?? '',
  difyBaseUrl: import.meta.env.VITE_DIFY_BASE_URL ?? 'https://api.dify.ai/v1',
  proxyUrl: import.meta.env.VITE_PROXY_URL ?? '',
  proxyApiKey: import.meta.env.VITE_PROXY_API_KEY ?? '',
}

// ── Schema (DB topology) ──────────────────────────────────────
export interface SchemaNodeDef {
  label: string
  properties: string[]
}

export interface SchemaRelDef {
  type: string
  from: string
  to: string
}

export interface SchemaData {
  nodes: SchemaNodeDef[]
  relationships: SchemaRelDef[]
}

// ── Condition chips ───────────────────────────────────────────
export interface Condition {
  id: string
  nodeType: string
  property?: string
  value?: string          // user-entered filter value, only set when property is defined
}

// ── Node color palette ────────────────────────────────────────
const PALETTE = [
  '#3b82f6','#a855f7','#f59e0b','#10b981','#ef4444',
  '#06b6d4','#f97316','#84cc16','#ec4899','#8b5cf6',
]

export function getNodeColor(label: string): string {
  if (NODE_TYPE_COLOR[label]) return NODE_TYPE_COLOR[label]
  // deterministic color for unknown labels
  let hash = 0
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) & 0xffffffff
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export const NODE_TYPE_COLOR: Record<string, string> = {
  TechOutline: '#3b82f6',
  TechText: '#a855f7',
  TechRequirement: '#f59e0b',
  TechTask: '#10b981',
  ResearchProject: '#ef4444',
}

export const NODE_TYPE_LABEL: Record<string, string> = {
  TechOutline: '大纲',
  TechText: '文本',
  TechRequirement: '需求',
  TechTask: '任务',
  ResearchProject: '项目',
}

export const RELATION_TYPE_LABEL: Record<string, string> = {
  HAS_OUTLINE: '关联大纲',
  HAS_TEXT: '关联文本',
  HAS_TASK: '关联任务',
  HAS_PROJECT: '关联项目',
  // legacy / future
  CONTAINS: '包含',
  SPECIFIES: '规定',
  DECOMPOSES_TO: '分解为',
  IMPLEMENTED_BY: '实现于',
  REFINES: '细化',
  DEPENDS_ON: '依赖',
}
