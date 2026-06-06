import type { Message } from '../types'
import { Bot, User, Code2 } from 'lucide-react'

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
    .replace(/^### (.+)$/gm, '<h3 style="margin:0.5rem 0 0.25rem;font-size:0.95em;font-weight:600">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:0.5rem 0 0.25rem;font-size:1em;font-weight:600">$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, (_, line) => line ? `<p>${line}</p>` : '')
}

export default function MessageBubble({ message, onShowCypher, onShowGraph }: Props) {
  const isUser = message.role === 'user'

  if (message.loading) {
    return (
      <div className="flex gap-3 items-start px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
          <Bot size={16} className="text-white" />
        </div>
        <div className="flex items-center gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-slate-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 items-start px-4 py-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-slate-600' : 'bg-indigo-600'
        }`}
      >
        {isUser
          ? <User size={16} className="text-white" />
          : <Bot size={16} className="text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : message.error
                ? 'bg-red-950 border border-red-800 text-red-300 rounded-tl-sm'
                : 'bg-[#1e2130] border border-[#2d3150] text-slate-200 rounded-tl-sm'
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

        {/* Action buttons for assistant messages with graph data */}
        {!isUser && (message.graphData || message.cypher) && (
          <div className="flex gap-2 mt-1">
            {message.graphData && message.graphData.nodes.length > 0 && (
              <button
                onClick={onShowGraph}
                className="text-xs px-2.5 py-1 rounded-full bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 hover:bg-indigo-800/60 transition-colors"
              >
                查看追溯图谱 ({message.graphData.nodes.length} 节点)
              </button>
            )}
            {message.cypher && (
              <button
                onClick={() => onShowCypher?.(message.cypher!)}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 transition-colors flex items-center gap-1"
              >
                <Code2 size={11} />
                Cypher
              </button>
            )}
          </div>
        )}

        <span className="text-[10px] text-slate-600 px-1">
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
