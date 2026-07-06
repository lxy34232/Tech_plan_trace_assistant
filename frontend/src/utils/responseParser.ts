import type { GraphData } from '../types'

export interface ParsedResponse {
  displayContent: string
  graphData?: GraphData
  cypher?: string
  queryResult?: string
}

const JSON_BLOCK_RE = /```json\s*([\s\S]*?)\s*```/g

/**
 * Parse the raw LLM response accumulated from the SSE stream.
 *
 * The response is natural-language markdown, optionally followed by a
 * ```json``` block carrying graph_data / cypher. We extract the last JSON
 * block that parses and contains graph data or Cypher; everything else is
 * shown as-is because thinking content arrives via agent_thought events.
 */
export function parseAssistantResponse(raw: string): ParsedResponse {
  let match: RegExpExecArray | null
  let last: RegExpExecArray | null = null
  JSON_BLOCK_RE.lastIndex = 0
  while ((match = JSON_BLOCK_RE.exec(raw)) !== null) last = match

  if (!last) {
    const partialIndex = raw.lastIndexOf('```json')
    if (partialIndex >= 0) return { displayContent: raw.slice(0, partialIndex).trim() }
    return { displayContent: raw.trim() }
  }

  try {
    const parsed = JSON.parse(last[1])
    if (parsed && typeof parsed === 'object' && ('graph_data' in parsed || 'cypher' in parsed)) {
      const displayContent =
        (raw.slice(0, last.index) + raw.slice(last.index + last[0].length)).trim()
      return {
        displayContent,
        graphData: parsed.graph_data ?? undefined,
        cypher: parsed.cypher ?? undefined,
        queryResult: last[1].trim(),
      }
    }
    return { displayContent: raw.trim() }
  } catch {
    return { displayContent: raw.slice(0, last.index).trim() }
  }
}
