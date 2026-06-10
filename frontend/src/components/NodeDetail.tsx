import { X, Hash, Calendar, FileText, Tag } from 'lucide-react'
import type { GraphNode } from '../types'
import { NODE_TYPE_COLOR, NODE_TYPE_LABEL } from '../types'

interface Props {
  node: GraphNode | null
  onClose: () => void
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value || '—'
  return JSON.stringify(value)
}

const PROP_LABELS: Record<string, string> = {
  reqId: '需求ID', outlineId: '大纲ID', textId: '文本ID', taskId: '任务ID', projectId: '项目ID',
  title: '标题', name: '名称', content: '内容', description: '描述',
  priority: '优先级', status: '状态', version: '版本', department: '部门',
  owner: '负责人', principal: '负责人', budget: '预算',
  startDate: '开始日期', endDate: '结束日期', approvedDate: '批准日期',
  createdAt: '创建时间', updatedAt: '更新时间',
}

const PRIORITY_COLORS: Record<string, string> = {
  '高': 'text-red-400 bg-red-500/10',
  '中': 'text-amber-400 bg-amber-500/10',
  '低': 'text-green-400 bg-green-500/10',
}

export default function NodeDetail({ node, onClose }: Props) {
  if (!node) return null

  const color = NODE_TYPE_COLOR[node.type] ?? '#64748b'
  const typeLabel = NODE_TYPE_LABEL[node.type] ?? node.type

  const importantKeys = ['title', 'name', 'content', 'description', 'priority', 'status', 'department', 'owner', 'principal', 'budget']
  const dateKeys = ['startDate', 'endDate', 'approvedDate', 'createdAt', 'updatedAt']
  const idKeys = ['reqId', 'outlineId', 'textId', 'taskId', 'projectId', 'version']

  const sectionIcons: Record<string, React.ReactNode> = {
    '基本信息': <FileText size={12} />,
    'ID & 版本': <Hash size={12} />,
    '时间信息': <Calendar size={12} />,
  }

  const grouped = [
    { group: '基本信息', keys: importantKeys },
    { group: 'ID & 版本', keys: idKeys },
    { group: '时间信息', keys: dateKeys },
  ]

  const getValueBadge = (key: string, value: unknown) => {
    const str = String(value)
    if (key === 'priority' && PRIORITY_COLORS[str]) {
      return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[str]}`}>{str}</span>
    }
    if (key === 'status') {
      return (
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          str === 'approved' || str === 'completed' ? 'text-green-400 bg-green-500/10' :
          str === 'draft' || str === 'todo' ? 'text-[var(--color-text-secondary)] bg-slate-500/10' :
          str === 'in_progress' ? 'text-blue-400 bg-blue-500/10' :
          str === 'archived' ? 'text-[var(--color-text-muted)] bg-slate-500/5' :
          'text-[var(--color-text-primary)] bg-slate-500/10'
        }`}>{str}</span>
      )
    }
    if (key === 'budget' && typeof value === 'string' && !isNaN(Number(value))) {
      return <span className="text-xs text-amber-400 font-mono">{Number(value).toLocaleString()} 万元</span>
    }
    return <span className="text-[var(--color-text-primary)] leading-snug text-xs font-mono break-words">{formatValue(value)}</span>
  }

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-card)] border-l border-[var(--color-border)] w-80 shrink-0 overflow-hidden animate-slide-in-right shadow-xl shadow-[var(--color-shadow)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50">
        <div className="relative">
          <div className="w-3.5 h-3.5 rounded-full" style={{ background: color }} />
          <div className="absolute inset-0 rounded-full" style={{ background: color, opacity: 0.3, filter: 'blur(4px)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wider">{typeLabel}</div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{node.label}</div>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-slate-700/50 rounded-lg p-1 transition-all duration-200"
          aria-label="关闭详情"
        >
          <X size={15} />
        </button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {grouped.map(({ group, keys }) => {
          const rows = keys
            .filter(k => node.properties[k] !== undefined && node.properties[k] !== null && node.properties[k] !== '')
            .map(k => ({ key: k, label: PROP_LABELS[k] ?? k, value: node.properties[k] }))

          if (rows.length === 0) return null

          return (
            <div key={group}>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">
                {sectionIcons[group]}
                {group}
              </div>
              <div className="space-y-2">
                {rows.map(({ key, label, value }) => (
                  <div key={key} className="text-sm group">
                    <div className="text-[11px] text-[var(--color-text-muted)] mb-1 font-medium">{label}</div>
                    <div className="bg-[var(--color-bg-input)] rounded-lg px-3 py-2.5 border border-[var(--color-border)]/50 group-hover:border-[var(--color-border)] transition-colors duration-200">
                      {getValueBadge(key, value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Tags for node types and domain_id */}
        <div className="pt-2 border-t border-[var(--color-border)]/50">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">
            <Tag size={12} />
            节点信息
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.labels.map(label => (
              <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-medium">
                {label}
              </span>
            ))}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/30 text-slate-500 font-mono">
              ID: {node.id.slice(0, 12)}…
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
