import { useState } from 'react'
import { X, Eye, EyeOff, ExternalLink, Zap, Server } from 'lucide-react'
import type { AppConfig } from '../types'

interface Props {
  config: AppConfig
  onSave: (config: AppConfig) => void
  onClose: () => void
}

function Field({
  label, hint, value, onChange, type = 'text', placeholder,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dim)] outline-none focus:border-indigo-500/50 focus:shadow-[0_0_0_3px_rgba(199,0,25,0.1)] transition-all duration-200 pr-9"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label={show ? '隐藏' : '显示'}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-[var(--color-text-dim)] leading-relaxed">{hint}</p>}
    </div>
  )
}

export default function ConfigModal({ config, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<AppConfig>({ ...config })
  const set = (key: keyof AppConfig) => (v: string) => setDraft(d => ({ ...d, [key]: v }))

  const handleSave = () => {
    onSave(draft)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg shadow-2xl shadow-[var(--color-shadow)] animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <SettingsIcon />
            连接设置
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-slate-700/50 rounded-lg p-1 transition-all duration-200"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Zap size={13} className="text-indigo-400" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Dify 配置</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
            <Field
              label="Dify Base URL"
              value={draft.difyBaseUrl}
              onChange={set('difyBaseUrl')}
              placeholder="https://api.dify.ai/v1"
              hint="Dify Cloud 默认值为 https://api.dify.ai/v1，自托管请填写实际地址"
            />
            <Field
              label="Dify API Key"
              value={draft.difyApiKey}
              onChange={set('difyApiKey')}
              type="password"
              placeholder="app-xxxxxxxxxxxxxxxx"
            />
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <Server size={13} className="text-[var(--color-text-secondary)]" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Neo4j 代理</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
            <Field
              label="代理服务地址"
              value={draft.proxyUrl}
              onChange={set('proxyUrl')}
              placeholder="https://your-proxy.onrender.com"
              hint="Neo4j 代理服务的 URL，用于 Schema 读取和 Dify 工具配置"
            />
            <Field
              label="代理 API Key"
              value={draft.proxyApiKey}
              onChange={set('proxyApiKey')}
              type="password"
              placeholder="your-secret-key"
            />
          </div>

          <a
            href="https://cloud.dify.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ExternalLink size={12} />
            打开 Dify Cloud 控制台
          </a>
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-slate-700/30 rounded-lg transition-all duration-200"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm bg-[#C70019] hover:bg-[#e0001c] text-white rounded-lg transition-all duration-200 shadow-sm shadow-[rgba(199,0,25,0.25)] font-medium"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--color-text-secondary)]">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  )
}
