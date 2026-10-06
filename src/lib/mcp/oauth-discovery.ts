import { validateExternalUrl } from '@/lib/security/url'

export interface McpOAuthMetadata {
  authorizationUrl: string
  tokenUrl: string
  scopes: string[]
  tokenEndpointAuthMethod: 'client_secret_post' | 'client_secret_basic'
}

interface ProtectedResourceMetadata {
  resource?: string
  authorization_servers?: string[]
  scopes_supported?: string[]
}

interface AuthorizationServerMetadata {
  issuer?: string
  authorization_endpoint?: string
  token_endpoint?: string
  scopes_supported?: string[]
  code_challenge_methods_supported?: string[]
  token_endpoint_auth_methods_supported?: string[]
}

export async function discoverMcpOAuth(mcpUrl: string): Promise<McpOAuthMetadata> {
  const endpoint = requireExternalUrl(mcpUrl)
  const challenge = await fetch(endpoint, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'xians-agent-studio', version: '1.0' },
      },
    }),
  })
  const resourceMetadataUrl = resourceMetadataFrom(challenge) ??
    protectedResourceMetadataUrl(endpoint)
  const resource = await fetchMetadata<ProtectedResourceMetadata>(resourceMetadataUrl)
  if (resource.resource && canonicalResource(resource.resource) !== canonicalResource(endpoint.toString())) {
    throw new Error('OAuth protected-resource metadata does not match the MCP URL')
  }
  const authorizationServer = resource.authorization_servers?.[0]
  if (!authorizationServer) throw new Error('MCP server did not advertise an OAuth authorization server')

  const issuer = requireExternalUrl(authorizationServer)
  const authorization = await fetchAuthorizationMetadata(issuer)
  if (!authorization.issuer || canonicalResource(authorization.issuer) !== canonicalResource(issuer.toString())) {
    throw new Error('OAuth authorization-server metadata has an invalid issuer')
  }
  if (!authorization.authorization_endpoint || !authorization.token_endpoint) {
    throw new Error('OAuth metadata is missing authorization or token endpoint')
  }
  if (authorization.code_challenge_methods_supported &&
      !authorization.code_challenge_methods_supported.includes('S256')) {
    throw new Error('OAuth server does not support PKCE S256')
  }

  return {
    authorizationUrl: requireExternalUrl(authorization.authorization_endpoint).toString(),
    tokenUrl: requireExternalUrl(authorization.token_endpoint).toString(),
    scopes: resource.scopes_supported ?? authorization.scopes_supported ?? [],
    tokenEndpointAuthMethod: selectTokenAuthMethod(authorization.token_endpoint_auth_methods_supported),
  }
}

function resourceMetadataFrom(response: Response): URL | null {
  const challenge = response.headers.get('www-authenticate')
  const match = challenge?.match(/resource_metadata=(?:"([^"]+)"|([^,\s]+))/i)
  if (!match) return null
  return requireExternalUrl(match[1] ?? match[2])
}

function authorizationMetadataUrl(issuer: URL): URL {
  const path = issuer.pathname === '/' ? '' : issuer.pathname.replace(/\/$/, '')
  return new URL(`/.well-known/oauth-authorization-server${path}`, issuer.origin)
}

function protectedResourceMetadataUrl(resource: URL): URL {
  const path = resource.pathname === '/' ? '' : resource.pathname.replace(/\/$/, '')
  return new URL(`/.well-known/oauth-protected-resource${path}`, resource.origin)
}

async function fetchAuthorizationMetadata(issuer: URL): Promise<AuthorizationServerMetadata> {
  try {
    return await fetchMetadata<AuthorizationServerMetadata>(authorizationMetadataUrl(issuer))
  } catch {
    const path = issuer.pathname === '/' ? '' : issuer.pathname.replace(/\/$/, '')
    return fetchMetadata<AuthorizationServerMetadata>(
      new URL(`${path}/.well-known/openid-configuration`, issuer.origin)
    )
  }
}

async function fetchMetadata<T>(url: URL): Promise<T> {
  const response = await fetch(requireExternalUrl(url.toString()), {
    headers: { Accept: 'application/json' },
    redirect: 'manual',
  })
  if (!response.ok) throw new Error(`OAuth metadata request failed (${response.status})`)
  return response.json() as Promise<T>
}

function requireExternalUrl(value: unknown): URL {
  const validation = validateExternalUrl(value)
  if (!validation.ok || !validation.url) {
    throw new Error(validation.reason ?? 'OAuth metadata contains an invalid URL')
  }
  return validation.url
}

function selectTokenAuthMethod(
  supported?: string[]
): 'client_secret_post' | 'client_secret_basic' {
  if (!supported || supported.includes('client_secret_post')) return 'client_secret_post'
  if (supported.includes('client_secret_basic')) return 'client_secret_basic'
  throw new Error('OAuth server does not support client secret authentication')
}

function canonicalResource(value: string): string {
  const url = requireExternalUrl(value)
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')
  return `${url.origin}${path}${url.search}`
}
