import { X } from 'lucide-react'
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

export default function NodeDetail({ node, onClose }: Props) {
  if (!node) return null

  const color = NODE_TYPE_COLOR[node.type] ?? '#64748b'
  const typeLabel = NODE_TYPE_LABEL[node.type] ?? node.type

  const importantKeys = ['title', 'name', 'content', 'description', 'priority', 'status', 'department', 'owner', 'principal', 'budget']
  const dateKeys = ['startDate', 'endDate', 'approvedDate', 'createdAt', 'updatedAt']
  const idKeys = ['reqId', 'outlineId', 'textId', 'taskId', 'projectId', 'version']

  const grouped = [
    { group: '基本信息', keys: importantKeys },
    { group: 'ID & 版本', keys: idKeys },
    { group: '时间信息', keys: dateKeys },
  ]

  return (
    <div className="h-full flex flex-col bg-[#1e2130] border-l border-[#2d3150] w-80 shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2d3150]">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500">{typeLabel}</div>
          <div className="text-sm font-medium text-slate-200 truncate">{node.label}</div>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors p-0.5">
          <X size={16} />
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
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-2">{group}</div>
              <div className="space-y-2">
                {rows.map(({ key, label, value }) => (
                  <div key={key} className="text-sm">
                    <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                    <div className="text-slate-300 leading-snug bg-[#13151f] rounded-lg px-3 py-2 text-xs font-mono break-words">
                      {formatValue(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
