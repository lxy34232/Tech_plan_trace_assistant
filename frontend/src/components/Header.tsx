import { Settings, Share2, MessageSquare, GitBranch, Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface Props {
  activeTab: 'chat' | 'graph'
  onTabChange: (tab: 'chat' | 'graph') => void
  onOpenConfig: () => void
  isMobile: boolean
}

export default function Header({ activeTab, onTabChange, onOpenConfig, isMobile }: Props) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 bg-[var(--color-bg-secondary)]/95 backdrop-blur-md border-b border-[var(--color-border)] shrink-0 relative z-20 shadow-[var(--shadow-xs)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/30 to-transparent" />

      <div className="flex items-center gap-2.5 mr-auto">
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C70019] to-[#8a0011] flex items-center justify-center shadow-lg shadow-[rgba(199,0,25,0.25)]">
            <Share2 size={15} className="text-white" />
          </div>
          <div className="absolute inset-0 rounded-lg ring-1 ring-[#C70019]/20" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">科技规划问答追溯助手</div>
          <div className="text-[10px] text-[var(--color-text-muted)] hidden sm:block font-medium tracking-wide">DOORS Trace Assistant</div>
        </div>
      </div>

      {isMobile && (
        <div className="flex bg-[var(--color-bg-primary)] rounded-lg p-0.5 border border-[var(--color-border)] shadow-inner">
          <button
            onClick={() => onTabChange('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all duration-200 ${
              activeTab === 'chat'
                ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <MessageSquare size={12} />
            <span className="hidden sm:inline">对话</span>
          </button>
          <button
            onClick={() => onTabChange('graph')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all duration-200 ${
              activeTab === 'graph'
                ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <GitBranch size={12} />
            <span className="hidden sm:inline">图谱</span>
          </button>
        </div>
      )}

      <button
        onClick={toggleTheme}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-bg-input)]/80 border border-[var(--color-border)] hover:border-[var(--color-primary-border)] hover:bg-[var(--color-bg-hover)] transition-all duration-200"
        aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        title={theme === 'dark' ? '浅色模式' : '深色模式'}
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      <button
        onClick={onOpenConfig}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-bg-input)]/80 border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary-border)] hover:bg-[var(--color-bg-hover)] transition-all duration-200"
        aria-label="打开设置"
      >
        <Settings size={13} />
        <span className="hidden sm:inline">设置</span>
      </button>
    </header>
  )
}
