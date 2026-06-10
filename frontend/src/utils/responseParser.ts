import type { GraphData } from '../types'

/**
 * Parse the raw LLM response accumulated from SSE stream.
 *
 * The raw response typically contains:
 *   1. Natural language summary (displayed in chat bubble)
 *   2. A ```json ... ``` block with graph_data and optional cypher
 *
 * The thinking content is captured separately via onThinking callback
 * and passed in from ChatPanel.
 *
 * Returns { displayContent, graphData, cypher, queryResult }.
 */
export function parseAssistantResponse(raw: string): {
  displayContent: string
  graphData?: GraphData
  cypher?: string
  queryResult?: string
} {
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```\s*$/
  const match = raw.match(jsonBlockRegex)

  if (!match) {
    return { displayContent: raw.trim() }
  }

  const jsonText = match[1]
  const displayContent = raw.slice(0, raw.lastIndexOf(match[0])).trim()

  try {
    const parsed = JSON.parse(jsonText)
    return {
      displayContent,
      graphData: parsed.graph_data ?? undefined,
      cypher: parsed.cypher ?? undefined,
      queryResult: jsonText.trim(),
    }
  } catch {
    return { displayContent: raw.trim() }
  }
}
