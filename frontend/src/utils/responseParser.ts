import type { GraphData } from '../types'

// Extracts a ```json ... ``` block from the end of LLM response.
// Returns { displayContent, graphData, cypher }.
export function parseAssistantResponse(raw: string): {
  displayContent: string
  graphData?: GraphData
  cypher?: string
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
    }
  } catch {
    return { displayContent: raw.trim() }
  }
}
