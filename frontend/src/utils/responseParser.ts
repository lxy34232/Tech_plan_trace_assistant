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
    return { displayContent: cleanDisplayContent(raw.trim()) }
  }

  const jsonText = match[1]
  const contentBeforeJson = raw.slice(0, raw.lastIndexOf(match[0])).trim()

  try {
    const parsed = JSON.parse(jsonText)
    return {
      displayContent: cleanDisplayContent(contentBeforeJson),
      graphData: parsed.graph_data ?? undefined,
      cypher: parsed.cypher ?? undefined,
      queryResult: jsonText.trim(),
    }
  } catch {
    return { displayContent: cleanDisplayContent(raw.trim()) }
  }
}

/**
 * Clean the display content by removing thinking process markers and intermediate text.
 * Only keep the final natural language answer.
 */
function cleanDisplayContent(text: string): string {
  // Remove thinking process markers and tool-related content
  let cleaned = text
    .replace(/💭\s*思考[:：].*/gi, '')
    .replace(/🔧\s*调用工具[:：].*/gi, '')
    .replace(/📥\s*工具输入[:：].*/gi, '')
    .replace(/📤\s*工具输出[:：].*/gi, '')
    .replace(/\[思考过程\].*/gi, '')
    .replace(/\[工具调用\].*/gi, '')
    .replace(/\[查询结果\].*/gi, '')
    .replace(/思考[:：].*/gi, '')
    .replace(/调用工具[:：].*/gi, '')
    .replace(/工具输入[:：].*/gi, '')
    .replace(/工具输出[:：].*/gi, '')
    .trim()

  // Split by paragraphs and filter out empty or thinking-related lines
  const lines = cleaned.split('\n').filter(line => {
    const trimmed = line.trim()
    return trimmed.length > 0 &&
      !trimmed.match(/^(思考|工具|调用|输入|输出|查询)/) &&
      !trimmed.includes('```')
  })

  // Find the last substantial paragraph (likely the final answer)
  // Look for paragraphs that are complete sentences (ending with punctuation)
  const substantialParagraphs: string[] = []
  let currentParagraph = ''

  for (const line of lines) {
    if (line.trim()) {
      currentParagraph += (currentParagraph ? '\n' : '') + line
    } else if (currentParagraph) {
      substantialParagraphs.push(currentParagraph)
      currentParagraph = ''
    }
  }
  if (currentParagraph) {
    substantialParagraphs.push(currentParagraph)
  }

  // Return the last few paragraphs (likely the final answer)
  // Filter out very short paragraphs
  const finalParagraphs = substantialParagraphs.filter(p => p.length > 20)
  
  if (finalParagraphs.length === 0) {
    return cleaned
  }

  // Take the last 2-3 paragraphs as the final answer
  return finalParagraphs.slice(-3).join('\n\n').trim()
}
