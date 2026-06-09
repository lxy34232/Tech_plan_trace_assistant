import { useState, useRef, useEffect, useCallback } from 'react'
import { SendHorizonal, RotateCcw, BookOpen } from 'lucide-react'
import type { Message, AppConfig, GraphData } from '../types'
import { sendChatMessage } from '../services/difyClient'
import { parseAssistantResponse } from '../utils/responseParser'
import MessageBubble from './MessageBubble'

interface Props {
  config: AppConfig
  onGraphData: (data: GraphData) => void
  onShowGraph: () => void
}

const SUGGESTED = [
  '查询所有高优先级的科技规划需求',
  '需求"XXX"向下追溯到哪些科研项目？',
  '查询状态为 in_progress 的任务及负责人',
  '大纲包含哪些文本？每个文本规定了哪些需求？',
]

export default function ChatPanel({ config, onGraphData, onShowGraph }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [cypherModal, setCypherModal] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(
    async (text: string) => {
      const query = text.trim()
      if (!query || isLoading) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: query,
        displayContent: query,
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

      setMessages(prev => [...prev, userMsg, loadingMsg])
      setInput('')
      setIsLoading(true)

      let accumulated = ''

      await sendChatMessage(config, query, conversationId, {
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
        onDone: (convId) => {
          if (convId) setConversationId(convId)
          const { displayContent, graphData, cypher } = parseAssistantResponse(accumulated)
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, loading: false, content: accumulated, displayContent, graphData, cypher }
                : m,
            ),
          )
          if (graphData && graphData.nodes.length > 0) {
            onGraphData(graphData)
          }
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
          setIsLoading(false)
        },
      })
    },
    [config, conversationId, isLoading, onGraphData],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const handleReset = () => {
    setMessages([])
    setConversationId(null)
    setInput('')
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
            <div className="text-center animate-fade-in">
              {/* Animated icon */}
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-700/20 border border-indigo-500/20 flex items-center justify-center animate-pulse-glow">
                  <BookOpen className="text-indigo-400" size={30} />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-indigo-500/5 blur-xl -z-10" />
              </div>
              <h2 className="text-xl font-semibold text-slate-200 mb-1.5 tracking-tight">DOORS 追溯问答</h2>
              <p className="text-sm text-slate-500">用自然语言查询科技规划数据库，支持全链路追溯分析</p>
            </div>

            {/* Suggested questions */}
            <div className="grid grid-cols-1 gap-2 w-full max-w-md">
              {SUGGESTED.map((s, i) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className={`text-left text-sm px-4 py-3 rounded-xl bg-[#1e2130] border border-[#2d3150] text-slate-400 hover:border-indigo-500/40 hover:text-slate-200 hover:bg-[#232840] transition-all duration-200 animate-fade-in-up group`}
                  style={{ animationDelay: `${i * 0.08 + 0.1}s` }}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                      <span className="text-[10px] text-indigo-400 font-medium">{i + 1}</span>
                    </span>
                    {s}
                  </span>
                </button>
              ))}
            </div>

            {/* Bottom hint */}
            <p className="text-[11px] text-slate-600 text-center animate-fade-in animate-delay-500">
              以上为示例问题，你也可以自由输入任何追溯查询
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onShowCypher={setCypherModal}
              onShowGraph={msg.graphData ? onShowGraph : undefined}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#2d3150] p-4 bg-gradient-to-t from-[#0f1117] to-transparent">
        <div className="flex gap-2 items-end bg-[#1e2130] border border-[#2d3150] rounded-2xl px-4 py-2.5 focus-within:border-indigo-500/50 focus-within:shadow-lg focus-within:shadow-indigo-500/5 transition-all duration-300">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题，Enter 发送，Shift+Enter 换行…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none outline-none py-1 max-h-32"
            style={{ lineHeight: '1.5rem' }}
            disabled={isLoading}
          />
          <div className="flex gap-1.5 items-center pb-0.5">
            <button
              onClick={handleReset}
              title="清空对话"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-slate-700/50 transition-all duration-200"
              aria-label="清空对话"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isLoading}
              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm shadow-indigo-600/30"
              aria-label="发送消息"
            >
              <SendHorizonal size={15} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-2 tracking-wide">
          AI 生成内容仅供参考，请以数据库原始数据为准
        </p>
      </div>

      {/* Cypher modal */}
      {cypherModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setCypherModal(null)}
        >
          <div
            className="bg-[#1e2130] border border-[#2d3150] rounded-2xl max-w-2xl w-full p-6 shadow-2xl shadow-black/40 animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-300">执行的 Cypher 查询</h3>
              <button onClick={() => setCypherModal(null)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
            </div>
            <pre className="text-xs text-emerald-300 bg-[#0d0f1a] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono">
              {cypherModal}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
