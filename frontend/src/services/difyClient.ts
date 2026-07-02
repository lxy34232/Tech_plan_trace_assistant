import type { AppConfig, GraphData } from '../types'

export interface StreamCallbacks {
  onToken: (token: string) => void
  onThinking: (thinking: string) => void
  /** toolGraphData: merged nodes/edges collected from all agent tool observations */
  onDone: (conversationId: string, messageId: string, toolGraphData?: GraphData) => void
  onError: (error: string) => void
}

export async function sendChatMessage(
  config: AppConfig,
  query: string,
  conversationId: string | null,
  callbacks: StreamCallbacks,
): Promise<void> {
  const { difyApiKey, difyBaseUrl } = config

  if (!difyApiKey) {
    callbacks.onError('请先在设置中配置 Dify API Key')
    return
  }

  let response: Response
  try {
    response = await fetch(`${difyBaseUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: 'streaming',
        conversation_id: conversationId ?? undefined,
        user: 'doors-trace-user',
      }),
    })
  } catch (err) {
    callbacks.onError(`网络错误：${err instanceof Error ? err.message : String(err)}`)
    return
  }

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    callbacks.onError(`Dify API 错误 ${response.status}：${text}`)
    return
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let convId = conversationId ?? ''
  let msgId = ''

  // Accumulate graph nodes/edges from all tool observations (keyed by id to deduplicate)
  const toolNodes = new Map<string, GraphData['nodes'][number]>()
  const toolEdges = new Map<string, GraphData['edges'][number]>()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue

      try {
        const event = JSON.parse(data)
        // Agent mode uses 'agent_message', Chatbot/Workflow uses 'message'
        if ((event.event === 'message' || event.event === 'agent_message') && event.answer) {
          callbacks.onToken(event.answer)
          if (event.conversation_id) convId = event.conversation_id
          if (event.message_id) msgId = event.message_id
        } else if (event.event === 'agent_thought') {
          // Capture agent thinking process (reasoning + tool calls + observations)
          const thinkingParts: string[] = []
          if (event.thought) thinkingParts.push(`💭 思考：${event.thought}`)
          if (event.tool) thinkingParts.push(`🔧 调用工具：${event.tool}`)
          if (event.tool_input) thinkingParts.push(`📥 工具输入：${event.tool_input}`)
          if (event.observation) {
            thinkingParts.push(`📤 工具输出：${event.observation}`)
            // Extract graph data from the actual tool response — the LLM may not copy
            // all nodes faithfully into its graph_data JSON block, so we collect here.
            try {
              const obs = JSON.parse(event.observation)
              const rawNodes: GraphData['nodes'] = obs.graph?.nodes ?? obs.graph_data?.nodes ?? []
              const rawEdges: GraphData['edges'] = obs.graph?.edges ?? obs.graph_data?.edges ?? []
              for (const n of rawNodes) toolNodes.set(n.id, n)
              for (const e of rawEdges) toolEdges.set(e.id, e)
            } catch { /* observation is not JSON or contains no graph data */ }
          }
          if (thinkingParts.length > 0) callbacks.onThinking(thinkingParts.join('\n'))
        } else if (event.event === 'message_end' || event.event === 'agent_message_end') {
          if (event.conversation_id) convId = event.conversation_id
          if (event.message_id) msgId = event.message_id
        } else if (event.event === 'error') {
          callbacks.onError(event.message ?? 'Dify 返回错误')
          return
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }

  const toolGraphData: GraphData | undefined = toolNodes.size > 0
    ? { nodes: Array.from(toolNodes.values()), edges: Array.from(toolEdges.values()) }
    : undefined

  callbacks.onDone(convId, msgId, toolGraphData)
}
