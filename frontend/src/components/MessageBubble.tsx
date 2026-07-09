import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../types'
import { Bot, User, Code2, GitBranch, Brain, Database, Copy } from 'lucide-react'

interface Props {
  message: Message
  onShowCypher?: (cypher: string) => void
  onShowGraph?: () => void
}

export default function MessageBubble({ message, onShowCypher, onShowGraph }: Props) {
  const isUser = message.role === 'user'
  const [showThinking, setShowThinking] = useState(false)
  const [showQueryResult, setShowQueryResult] = useState(false)

  if (message.loading) {
    return (
      <div className="flex gap-3 items-start px-4 py-3 animate-fade-in">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-active)] flex items-center justify-center shrink-0 shadow-[var(--shadow-sm)]">
          <Bot size={15} className="text-white" />
        </div>
        <div className="flex items-center gap-1.5 mt-2 px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--color-primary)]/60"
              style={{ animation: `dot-bounce 1.4s ${i * 0.2}s infinite ease-in-out` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 items-start px-4 py-3 animate-fade-in-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
          isUser
            ? 'bg-gradient-to-br from-[var(--color-text-muted)] to-[var(--color-text-secondary)] shadow-[var(--shadow-sm)]'
            : 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-active)] shadow-[var(--shadow-sm)]'
        }`}
      >
        {isUser ? <User size={15} className="text-white" /> : <Bot size={15} className="text-white" />}
      </div>

      <div className={`max-w-[85%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-[var(--color-primary-solid)] text-white rounded-tr-sm shadow-[var(--shadow-sm)]'
              : message.error
                ? 'bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] text-[var(--color-danger-text)] rounded-tl-sm'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-tl-sm shadow-[var(--shadow-sm)]'
          }`}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.displayContent}</span>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.displayContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.thinking && (
          <div className="w-full">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-all duration-200 flex items-center gap-1.5 w-full"
            >
              <Brain size={11} className="text-[var(--color-warning-text)]" />
              思考过程
              <span className={`ml-auto transition-transform duration-200 text-[10px] ${showThinking ? 'rotate-90' : ''}`}>›</span>
            </button>
            {showThinking && (
              <div className="mt-1.5 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-think)] border border-[var(--color-border)] rounded-xl p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed animate-fade-in">
                {message.thinking}
              </div>
            )}
          </div>
        )}

        {!isUser && message.queryResult && (
          <div className="w-full">
            <button
              onClick={() => setShowQueryResult(!showQueryResult)}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-all duration-200 flex items-center gap-1.5 w-full"
            >
              <Database size={11} className="text-[var(--color-success-text)]" />
              查询结果数据
              <span className={`ml-auto transition-transform duration-200 text-[10px] ${showQueryResult ? 'rotate-90' : ''}`}>›</span>
            </button>
            {showQueryResult && (
              <div className="mt-1.5 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-code)] border border-[var(--color-border)] rounded-xl p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed animate-fade-in">
                {message.queryResult}
              </div>
            )}
          </div>
        )}

        {!isUser && (message.graphData || message.cypher || (!message.error && message.displayContent)) && (
          <div className="flex gap-2 mt-1 flex-wrap">
            {!message.error && message.displayContent && (
              <button
                onClick={() => navigator.clipboard.writeText(message.displayContent)}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-all duration-200 flex items-center gap-1.5"
              >
                <Copy size={11} />
                复制
              </button>
            )}
            {message.graphData && message.graphData.nodes.length > 0 && (
              <button
                onClick={onShowGraph}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] text-[var(--color-primary-text)] hover:bg-[var(--color-primary-soft)] hover:border-[var(--color-primary-border)] transition-all duration-200 flex items-center gap-1.5"
              >
                <GitBranch size={11} />
                查看追溯图谱 ({message.graphData.nodes.length} 节点)
              </button>
            )}
            {message.cypher && (
              <button
                onClick={() => onShowCypher?.(message.cypher!)}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-all duration-200 flex items-center gap-1.5"
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
