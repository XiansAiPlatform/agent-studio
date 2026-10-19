export function oauthMcpConnectionKey(name: string): string {
  const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64)
  const checksum = Buffer.from(name).reduce((value, byte) => Math.imul(value ^ byte, 16777619) >>> 0, 2166136261)
  return `MCP_OAUTH_${(slug || 'CONNECTION').slice(0, 55)}_${checksum.toString(16).padStart(8, '0').toUpperCase()}`
}
