import type { AppConfig } from '../types'

export interface StreamCallbacks {
  onToken: (token: string) => void
  onThinking: (thinking: string) => void
  onDone: (conversationId: string, messageId: string) => void
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
          let thinkingParts: string[] = []
          if (event.thought) {
            thinkingParts.push(`💭 思考：${event.thought}`)
          }
          if (event.tool) {
            thinkingParts.push(`🔧 调用工具：${event.tool}`)
          }
          if (event.tool_input) {
            thinkingParts.push(`📥 工具输入：${event.tool_input}`)
          }
          if (event.observation) {
            thinkingParts.push(`📤 工具输出：${event.observation}`)
          }
          if (thinkingParts.length > 0) {
            callbacks.onThinking(thinkingParts.join('\n'))
          }
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

  callbacks.onDone(convId, msgId)
}
