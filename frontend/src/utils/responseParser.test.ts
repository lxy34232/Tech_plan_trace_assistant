import { describe, expect, it } from 'vitest'

import { parseAssistantResponse } from './responseParser'

const GRAPH_BLOCK = `\`\`\`json
{"graph_data":{"nodes":[{"id":"1","domain_id":"R1","labels":["TechRequirement"],"type":"TechRequirement","label":"需求1","properties":{}}],"edges":[]},"cypher":"MATCH (n) RETURN n"}
\`\`\``

describe('parseAssistantResponse', () => {
  it('keeps short natural-language answers', () => {
    const r = parseAssistantResponse('共找到 3 个高优先级需求。')
    expect(r.displayContent).toBe('共找到 3 个高优先级需求。')
    expect(r.graphData).toBeUndefined()
  })

  it('keeps answers starting with 查询', () => {
    const r = parseAssistantResponse(`查询结果如下：\n\n共 2 条。\n\n${GRAPH_BLOCK}`)
    expect(r.displayContent).toContain('查询结果如下')
    expect(r.displayContent).toContain('共 2 条')
  })

  it('extracts graph_data and cypher from a json block', () => {
    const r = parseAssistantResponse(`答案正文。\n\n${GRAPH_BLOCK}`)
    expect(r.displayContent).toBe('答案正文。')
    expect(r.graphData?.nodes).toHaveLength(1)
    expect(r.cypher).toBe('MATCH (n) RETURN n')
  })

  it('hides an incomplete streaming json block', () => {
    const r = parseAssistantResponse('正文。\n\n```json\n{"graph_data": {"nodes": [')
    expect(r.displayContent).toBe('正文。')
  })

  it('leaves non-graph json code examples in place', () => {
    const raw = '示例配置：\n\n```json\n{"foo": 1}\n```'
    const r = parseAssistantResponse(raw)
    expect(r.displayContent).toBe(raw)
    expect(r.graphData).toBeUndefined()
  })

  it('uses the last graph block when several json blocks exist', () => {
    const raw = '```json\n{"foo": 1}\n```\n中间文字\n' + GRAPH_BLOCK
    const r = parseAssistantResponse(raw)
    expect(r.graphData?.nodes).toHaveLength(1)
    expect(r.displayContent).toContain('中间文字')
  })
})
