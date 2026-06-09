import { Settings, Share2, MessageSquare, GitBranch } from 'lucide-react'

interface Props {
  activeTab: 'chat' | 'graph'
  onTabChange: (tab: 'chat' | 'graph') => void
  onOpenConfig: () => void
  isMobile: boolean
}

export default function Header({ activeTab, onTabChange, onOpenConfig, isMobile }: Props) {
  return (
    <header className="flex items-center gap-3 px-4 py-2.5 bg-[#1a1d27]/95 backdrop-blur-md border-b border-[#2d3150] shrink-0 relative z-20">
      {/* Subtle top glow bar */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      {/* Brand */}
      <div className="flex items-center gap-2.5 mr-auto">
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Share2 size={15} className="text-white" />
          </div>
          <div className="absolute inset-0 rounded-lg ring-1 ring-indigo-400/20" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-200 tracking-tight">科技规划问答追溯助手</div>
          <div className="text-[10px] text-slate-500 hidden sm:block font-medium tracking-wide">DOORS Trace Assistant</div>
        </div>
      </div>

      {/* Mobile tab switcher */}
      {isMobile && (
        <div className="flex bg-[#0f1117] rounded-lg p-0.5 border border-[#2d3150] shadow-inner">
          <button
            onClick={() => onTabChange('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all duration-200 ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <MessageSquare size={12} />
            <span className="hidden sm:inline">对话</span>
          </button>
          <button
            onClick={() => onTabChange('graph')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all duration-200 ${
              activeTab === 'graph'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <GitBranch size={12} />
            <span className="hidden sm:inline">图谱</span>
          </button>
        </div>
      )}

      {/* Config button */}
      <button
        onClick={onOpenConfig}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#13151f]/80 border border-[#2d3150] rounded-lg hover:border-indigo-500/40 hover:bg-[#1a1d27] transition-all duration-200"
        aria-label="打开设置"
      >
        <Settings size={13} />
        <span className="hidden sm:inline">设置</span>
      </button>
    </header>
  )
}
