import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

export interface McpOAuthState {
  state: string
  name: string
  connectionKey: string
  providerId: 'oauth-mcp'
  mcpUrl: string
  authorizationUrl: string
  tokenUrl: string
  scopes: string[]
  tokenEndpointAuthMethod: 'client_secret_post' | 'client_secret_basic'
  clientId: string
  clientSecret: string
  codeVerifier: string
  agentName: string
  activationName: string
  tenantId: string
  userId: string
  returnUrl: string
  createdAt: number
}

const algorithm = 'aes-256-gcm'

function key(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is required for MCP OAuth connections')
  return createHash('sha256').update(secret).digest()
}

export function sealOAuthState(value: McpOAuthState): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(algorithm, key(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
}

export function unsealOAuthState(value: string): McpOAuthState {
  const payload = Buffer.from(value, 'base64url')
  const decipher = createDecipheriv(algorithm, key(), payload.subarray(0, 12))
  decipher.setAuthTag(payload.subarray(12, 28))
  const json = Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString()
  return JSON.parse(json) as McpOAuthState
}
