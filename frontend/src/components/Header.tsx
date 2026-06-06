import { Settings, Share2, MessageSquare, GitBranch } from 'lucide-react'

interface Props {
  activeTab: 'chat' | 'graph'
  onTabChange: (tab: 'chat' | 'graph') => void
  onOpenConfig: () => void
  isMobile: boolean
}

export default function Header({ activeTab, onTabChange, onOpenConfig, isMobile }: Props) {
  return (
    <header className="flex items-center gap-3 px-4 py-2.5 bg-[#1a1d27] border-b border-[#2d3150] shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-auto">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Share2 size={14} className="text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-200">科技规划问答追溯助手</div>
          <div className="text-[10px] text-slate-600 hidden sm:block">科技规划信息问答与追溯</div>
        </div>
      </div>

      {/* Mobile tab switcher */}
      {isMobile && (
        <div className="flex bg-[#0f1117] rounded-lg p-0.5 border border-[#2d3150]">
          <button
            onClick={() => onTabChange('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <MessageSquare size={12} />
            对话
          </button>
          <button
            onClick={() => onTabChange('graph')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'graph'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <GitBranch size={12} />
            图谱
          </button>
        </div>
      )}

      {/* Config button */}
      <button
        onClick={onOpenConfig}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-200 bg-[#13151f] border border-[#2d3150] rounded-lg hover:border-indigo-600/50 transition-all"
      >
        <Settings size={13} />
        <span className="hidden sm:inline">设置</span>
      </button>
    </header>
  )
}
