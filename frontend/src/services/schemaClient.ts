import type { SchemaData } from '../types'

export async function fetchSchema(proxyUrl: string, apiKey: string): Promise<SchemaData> {
  if (!proxyUrl) throw new Error('未配置代理服务地址')

  const response = await fetch(`${proxyUrl}/schema`, {
    headers: apiKey ? { 'X-API-Key': apiKey } : {},
  })

  if (!response.ok) {
    throw new Error(`Schema 加载失败 (${response.status})`)
  }

  return response.json()
}
