import { useState } from 'react'
import type { Message } from '../types'
import { Bot, User, Code2, GitBranch, Brain, Database } from 'lucide-react'

interface Props {
  message: Message
  onShowCypher?: (cypher: string) => void
  onShowGraph?: () => void
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, (_, line) => line ? `<p>${line}</p>` : '')
}

export default function MessageBubble({ message, onShowCypher, onShowGraph }: Props) {
  const isUser = message.role === 'user'
  const [showThinking, setShowThinking] = useState(false)
  const [showQueryResult, setShowQueryResult] = useState(false)

  if (message.loading) {
    return (
      <div className="flex gap-3 items-start px-4 py-3 animate-fade-in">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
          <Bot size={15} className="text-white" />
        </div>
        <div className="flex items-center gap-1.5 mt-2 px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-400/60"
              style={{ animation: `dot-bounce 1.4s ${i * 0.2}s infinite ease-in-out` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 items-start px-4 py-3 animate-fade-in-up ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
          isUser
            ? 'bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-500/20'
            : 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/20'
        }`}
      >
        {isUser
          ? <User size={15} className="text-white" />
          : <Bot size={15} className="text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/15'
              : message.error
                ? 'bg-red-950/60 border border-red-800/50 text-red-300 rounded-tl-sm'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-tl-sm shadow-sm'
          }`}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.displayContent}</span>
          ) : (
            <div
              className="prose-chat"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.displayContent) }}
            />
          )}
        </div>

        {/* Collapsible: Thinking process */}
        {!isUser && message.thinking && (
          <div className="w-full">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/30 transition-all duration-200 flex items-center gap-1.5 w-full"
            >
              <Brain size={11} />
              思考过程
              <span className={`ml-auto transition-transform duration-200 text-[10px] ${showThinking ? 'rotate-90' : ''}`}>▶</span>
            </button>
            {showThinking && (
              <div className="mt-1.5 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-think)] border border-[var(--color-border)] rounded-xl p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed animate-fade-in">
                {message.thinking}
              </div>
            )}
          </div>
        )}

        {/* Collapsible: Query result (raw JSON) */}
        {!isUser && message.queryResult && (
          <div className="w-full">
            <button
              onClick={() => setShowQueryResult(!showQueryResult)}
              className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all duration-200 flex items-center gap-1.5 w-full"
            >
              <Database size={11} />
              查询结果数据
              <span className={`ml-auto transition-transform duration-200 text-[10px] ${showQueryResult ? 'rotate-90' : ''}`}>▶</span>
            </button>
            {showQueryResult && (
              <div className="mt-1.5 text-xs text-emerald-300 bg-[var(--color-bg-code)] border border-emerald-500/20 rounded-xl p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed animate-fade-in">
                {message.queryResult}
              </div>
            )}
          </div>
        )}

        {/* Action buttons for assistant messages */}
        {!isUser && (message.graphData || message.cypher) && (
          <div className="flex gap-2 mt-1 flex-wrap">
            {message.graphData && message.graphData.nodes.length > 0 && (
              <button
                onClick={onShowGraph}
                className="text-xs px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all duration-200 flex items-center gap-1.5"
              >
                <GitBranch size={11} />
                查看追溯图谱 ({message.graphData.nodes.length} 节点)
              </button>
            )}
            {message.cypher && (
              <button
                onClick={() => onShowCypher?.(message.cypher!)}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-700/30 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-slate-700/50 hover:text-[var(--color-text-primary)] transition-all duration-200 flex items-center gap-1.5"
              >
                <Code2 size={11} />
                Cypher
              </button>
            )}
          </div>
        )}

        <span className="text-[10px] text-[var(--color-text-dim)] px-1">
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
