import { useState } from 'react'
import { X, Eye, EyeOff, ExternalLink } from 'lucide-react'
import type { AppConfig } from '../types'

interface Props {
  config: AppConfig
  onSave: (config: AppConfig) => void
  onClose: () => void
}

function Field({
  label, hint, value, onChange, type = 'text', placeholder,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-400">{label}</label>
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#13151f] border border-[#2d3150] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-600/60 pr-9"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1e2130] border border-[#2d3150] rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d3150]">
          <h2 className="text-base font-semibold text-slate-200">连接设置</h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Dify section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-[#2d3150]" />
              <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Dify 配置</span>
              <div className="h-px flex-1 bg-[#2d3150]" />
            </div>
            <Field
              label="Dify Base URL"
              value={draft.difyBaseUrl}
              onChange={set('difyBaseUrl')}
              placeholder="https://api.dify.ai/v1"
              hint="Dify Cloud 默认值 https://api.dify.ai/v1，自托管请填写实际地址"
            />
            <Field
              label="Dify API Key"
              value={draft.difyApiKey}
              onChange={set('difyApiKey')}
              type="password"
              placeholder="app-xxxxxxxxxxxxxxxx"
              hint={undefined}
            />
          </div>

          {/* Proxy section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-[#2d3150]" />
              <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Neo4j 代理</span>
              <div className="h-px flex-1 bg-[#2d3150]" />
            </div>
            <Field
              label="代理服务地址"
              value={draft.proxyUrl}
              onChange={set('proxyUrl')}
              placeholder="https://your-proxy.onrender.com"
              hint="Neo4j 代理服务的 URL（由 Dify 调用，无需在此填写即可使用）"
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
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
          >
            <ExternalLink size={12} />
            打开 Dify Cloud 控制台
          </a>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-[#2d3150]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
