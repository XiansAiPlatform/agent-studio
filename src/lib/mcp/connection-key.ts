export function oauthMcpConnectionKey(name: string): string {
  const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64)
  if (slug) return `MCP_OAUTH_${slug}`
  let hash = 2166136261
  for (let index = 0; index < name.length; index++) {
    hash ^= name.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  const value = (hash >>> 0).toString(16).padStart(8, '0').toUpperCase()
  return `MCP_OAUTH_${value}`
}
