import { createHash } from 'node:crypto'

export function oauthMcpConnectionKey(name: string): string {
  const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64)
  const hash = createHash('sha256').update(name).digest('hex').slice(0, 8).toUpperCase()
  return `MCP_OAUTH_${(slug || 'CONNECTION').slice(0, 55)}_${hash}`
}
