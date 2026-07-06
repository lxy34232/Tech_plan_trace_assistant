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
                    placeholder="值"
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
