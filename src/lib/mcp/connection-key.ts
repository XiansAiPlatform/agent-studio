export function oauthMcpConnectionKey(name: string): string {
  const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64)
  if (slug) return `MCP_OAUTH_${slug}`
  const value = Buffer.from(name, 'utf8').toString('base64url')
  return `MCP_OAUTH_${value}`
}
