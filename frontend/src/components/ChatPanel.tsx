import { useState, useRef, useEffect, useCallback } from 'react'
import { SendHorizonal, RotateCcw, BookOpen, Square } from 'lucide-react'
import type { Message, AppConfig, GraphData, Condition } from '../types'
import { NODE_TYPE_LABEL } from '../types'
import { sendChatMessage } from '../services/difyClient'
import { parseAssistantResponse } from '../utils/responseParser'
import MessageBubble from './MessageBubble'
import ConditionBar from './ConditionBar'

interface Props {
  config: AppConfig
  conditions: Condition[]
  onRemoveCondition: (id: string) => void
  onClearConditions: () => void
  onUpdateConditionValue: (id: string, value: string) => void
  onGraphData: (data: GraphData) => void
  onShowGraph: (data?: GraphData) => void
}

const MESSAGES_KEY = 'doors_trace_messages'
const CONV_KEY = 'doors_trace_conversation_id'
const MAX_SAVED = 50

const SUGGESTED = [
  '查询所有高优先级的科技规划需求',
  '需求“XXX”向下追溯到哪些科研项目？',
  '查询规划中有关高速重载机车的相关内容',
  '大纲包含哪些文本？每个文本规定了哪些需求？',
]

function loadSavedMessages(): Message[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as (Omit<Message, 'timestamp'> & { timestamp: string })[]
    return arr.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
  } catch {
    return []
  }
}

export default function ChatPanel({
  config,
  conditions,
  onRemoveCondition,
  onClearConditions,
  onUpdateConditionValue,
  onGraphData,
  onShowGraph,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(loadSavedMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(() => localStorage.getItem(CONV_KEY))
  const [cypherModal, setCypherModal] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const done = messages.filter(m => !m.loading).slice(-MAX_SAVED)
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(done))
    } catch { /* quota exceeded */ }
  }, [messages])

  useEffect(() => {
    if (conversationId) localStorage.setItem(CONV_KEY, conversationId)
    else localStorage.removeItem(CONV_KEY)
  }, [conversationId])

  useEffect(() => () => abortRef.current?.abort(), [])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
    setMessages(prev => prev.map(m => (m.loading ? { ...m, loading: false } : m)))
  }, [])

  const handleSend = useCallback(
    async (text: string) => {
      const query = text.trim()
      if (!query || isLoading) return

      let finalQuery = query
      if (conditions.length > 0) {
        const condStr = conditions
          .map(c => {
            const nodeLabel = NODE_TYPE_LABEL[c.nodeType] ?? c.nodeType
            if (!c.property) return nodeLabel
            if (c.value) return `${nodeLabel}(${c.property}="${c.value}")`
            return `${nodeLabel}(${c.property})`
          })
          .join('、')
        finalQuery = `【查询条件：${condStr}】${query}`
      }
      onClearConditions()

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: finalQuery,
        displayContent: finalQuery,
        timestamp: new Date(),
      }

      const assistantId = crypto.randomUUID()
      const loadingMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        displayContent: '',
        timestamp: new Date(),
        loading: true,
      }

      const controller = new AbortController()
      abortRef.current = controller
      setMessages(prev => [...prev, userMsg, loadingMsg])
      setInput('')
      setIsLoading(true)

      let accumulated = ''
      let thinkingAccumulated = ''

      await sendChatMessage(config, finalQuery, conversationId, {
        onToken: (token) => {
          accumulated += token
          const { displayContent } = parseAssistantResponse(accumulated)
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, loading: false, content: accumulated, displayContent }
                : m,
            ),
          )
        },
        onThinking: (thinking) => {
          thinkingAccumulated += (thinkingAccumulated ? '\n\n' : '') + thinking
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, thinking: thinkingAccumulated }
                : m,
            ),
          )
        },
        onDone: (convId, _msgId, toolGraphData) => {
          if (convId) setConversationId(convId)
          const { displayContent, graphData: llmGraphData, cypher, queryResult } = parseAssistantResponse(accumulated)
          const finalGraphData = toolGraphData ?? llmGraphData
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, loading: false, content: accumulated, displayContent, graphData: finalGraphData, cypher, queryResult, thinking: thinkingAccumulated || undefined }
                : m,
            ),
          )
          if (finalGraphData && finalGraphData.nodes.length > 0) onGraphData(finalGraphData)
          abortRef.current = null
          setIsLoading(false)
        },
        onError: (error) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, loading: false, displayContent: error, error: true }
                : m,
            ),
          )
          abortRef.current = null
          setIsLoading(false)
        },
      }, controller.signal)
    },
    [config, conversationId, isLoading, conditions, onClearConditions, onGraphData],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const handleReset = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setConversationId(null)
    setInput('')
    setIsLoading(false)
    localStorage.removeItem(MESSAGES_KEY)
    localStorage.removeItem(CONV_KEY)
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      <div className="flex-1 overflow-y-auto py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
            <div className="text-center animate-fade-in">
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-primary-soft)] border border-[var(--color-primary-border)] flex items-center justify-center animate-pulse-glow">
                  <BookOpen className="text-[var(--color-primary-text)]" size={30} />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-[var(--color-primary-soft)] blur-xl -z-10" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1.5 tracking-tight">DOORS 追溯问答</h2>
              <p className="text-sm text-[var(--color-text-muted)]">用自然语言查询科技规划数据库，支持全链路追溯分析</p>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full max-w-md">
              {SUGGESTED.map((s, i) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-sm px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-border)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-all duration-200 animate-fade-in-up group"
                  style={{ animationDelay: `${i * 0.08 + 0.1}s` }}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-[var(--color-primary-soft)] flex items-center justify-center shrink-0 group-hover:bg-[var(--color-primary-soft)] transition-colors">
                      <span className="text-[10px] text-[var(--color-primary-text)] font-medium">{i + 1}</span>
                    </span>
                    {s}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-[var(--color-text-dim)] text-center animate-fade-in animate-delay-500">
              以上为示例问题，你也可以自由输入任何追溯查询
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onShowCypher={setCypherModal}
              onShowGraph={msg.graphData ? () => onShowGraph(msg.graphData) : undefined}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <ConditionBar
        conditions={conditions}
        onRemove={onRemoveCondition}
        onClear={onClearConditions}
        onUpdateValue={onUpdateConditionValue}
      />

      <div className="border-t border-[var(--color-border)] p-4 bg-gradient-to-t from-[var(--color-bg-primary)] to-transparent">
        <div className="flex gap-2 items-end bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl px-4 py-2.5 focus-within:border-[var(--color-primary-border)] focus-within:shadow-[var(--shadow-md)] transition-all duration-300">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题，Enter 发送，Shift+Enter 换行..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dim)] resize-none outline-none py-1 max-h-32"
            style={{ lineHeight: '1.5rem' }}
            disabled={isLoading}
          />
          <div className="flex gap-1.5 items-center pb-0.5">
            <button
              onClick={handleReset}
              title="清空对话"
              className="p-1.5 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-all duration-200"
              aria-label="清空对话"
            >
              <RotateCcw size={15} />
            </button>
            {isLoading ? (
              <button
                onClick={handleStop}
                className="p-1.5 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-all duration-200"
                aria-label="停止生成"
                title="停止生成"
              >
                <Square size={15} />
              </button>
            ) : (
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim()}
                className="p-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-[var(--shadow-sm)]"
                aria-label="发送消息"
              >
                <SendHorizonal size={15} />
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-[var(--color-text-dim)] text-center mt-2 tracking-wide">
          AI 生成内容仅供参考，请以数据库原始数据为准
        </p>
      </div>

      {cypherModal && (
        <div
          className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setCypherModal(null)}
        >
          <div
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full p-6 shadow-[var(--shadow-lg)] animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-text-emphasis)]">执行的 Cypher 查询</h3>
              <button onClick={() => setCypherModal(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-lg leading-none">×</button>
            </div>
            <pre className="text-xs text-[var(--color-text-primary)] bg-[var(--color-bg-code)] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono">
              {cypherModal}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
