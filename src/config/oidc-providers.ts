/**
 * Configuration for supported OIDC service providers
 */

export interface OIDCProviderConfig {
  id: string
  name: string
  displayName: string
  category: 'productivity' | 'storage' | 'communication' | 'development'
  icon: string
  color: string
  wellKnownUrl: string
  defaultScopes: string[]
  requiredScopes: string[]
  documentation?: string
  apiBaseUrl?: string
  description: string
}

export const OIDC_PROVIDERS: Record<string, OIDCProviderConfig> = {
  'sharepoint': {
    id: 'sharepoint',
    name: 'sharepoint',
    displayName: 'SharePoint Online',
    category: 'productivity',
    icon: '📄',
    color: '#0078d4',
    wellKnownUrl: 'https://login.microsoftonline.com/{tenantId}/.well-known/openid_configuration',
    defaultScopes: [
      'openid',
      'profile',
      'email',
      'https://graph.microsoft.com/Sites.Read.All',
      'https://graph.microsoft.com/Files.Read.All'
    ],
    requiredScopes: [
      'openid',
      'profile'
    ],
    apiBaseUrl: 'https://graph.microsoft.com/v1.0',
    description: 'Access SharePoint sites, documents, and lists',
    documentation: 'https://docs.microsoft.com/en-us/graph/api/resources/sharepoint'
  },
  'google-workspace': {
    id: 'google-workspace',
    name: 'google-workspace',
    displayName: 'Google Workspace',
    category: 'productivity',
    icon: '🔗',
    color: '#4285f4',
    wellKnownUrl: 'https://accounts.google.com/.well-known/openid_configuration',
    defaultScopes: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    ],
    requiredScopes: [
      'openid',
      'profile'
    ],
    apiBaseUrl: 'https://www.googleapis.com',
    description: 'Access Google Drive, Docs, Sheets, and other Workspace apps',
    documentation: 'https://developers.google.com/workspace'
  },
  'slack': {
    id: 'slack',
    name: 'slack',
    displayName: 'Slack',
    category: 'communication',
    icon: '💬',
    color: '#4a154b',
    wellKnownUrl: 'https://slack.com/.well-known/openid_configuration',
    defaultScopes: [
      'openid',
      'profile',
      'email',
      'channels:read',
      'groups:read',
      'im:read',
      'mpim:read',
      'files:read',
      'users:read'
    ],
    requiredScopes: [
      'openid',
      'profile'
    ],
    apiBaseUrl: 'https://slack.com/api',
    description: 'Read Slack channels, messages, and files',
    documentation: 'https://api.slack.com/authentication/oauth-v2'
  },
  'outlook365': {
    id: 'outlook365',
    name: 'outlook365',
    displayName: 'Outlook 365',
    category: 'productivity',
    icon: '📧',
    color: '#0078d4',
    wellKnownUrl: 'https://login.microsoftonline.com/{tenantId}/.well-known/openid_configuration',
    defaultScopes: [
      'openid',
      'profile',
      'email',
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Calendars.Read',
      'https://graph.microsoft.com/Contacts.Read'
    ],
    requiredScopes: [
      'openid',
      'profile'
    ],
    apiBaseUrl: 'https://graph.microsoft.com/v1.0',
    description: 'Access Outlook emails, calendar, and contacts',
    documentation: 'https://docs.microsoft.com/en-us/graph/api/resources/mail-api-overview'
  },
  'github': {
    id: 'github',
    name: 'github',
    displayName: 'GitHub',
    category: 'development',
    icon: '🐙',
    color: '#24292e',
    wellKnownUrl: 'https://token.actions.githubusercontent.com/.well-known/openid_configuration',
    defaultScopes: [
      'openid',
      'read:user',
      'repo',
      'read:org'
    ],
    requiredScopes: [
      'openid',
      'read:user'
    ],
    apiBaseUrl: 'https://api.github.com',
    description: 'Access GitHub repositories, issues, and organization data',
    documentation: 'https://docs.github.com/en/rest'
  },
  'notion': {
    id: 'notion',
    name: 'notion',
    displayName: 'Notion',
    category: 'productivity',
    icon: '📝',
    color: '#000000',
    wellKnownUrl: 'https://api.notion.com/.well-known/openid_configuration',
    defaultScopes: [
      'openid',
      'profile',
      'read'
    ],
    requiredScopes: [
      'openid'
    ],
    apiBaseUrl: 'https://api.notion.com/v1',
    description: 'Access Notion pages, databases, and blocks',
    documentation: 'https://developers.notion.com/reference/intro'
  }
}

export const PROVIDER_CATEGORIES = {
  'productivity': {
    name: 'Productivity',
    description: 'Document management, spreadsheets, and productivity tools',
    icon: '📊'
  },
  'communication': {
    name: 'Communication',
    description: 'Chat platforms, messaging, and collaboration tools',
    icon: '💬'
  },
  'storage': {
    name: 'Storage',
    description: 'Cloud storage and file management services',
    icon: '💾'
  },
  'development': {
    name: 'Development',
    description: 'Code repositories, CI/CD, and development tools',
    icon: '⚙️'
  }
} as const

export function getProvidersByCategory() {
  const categorized: Record<string, OIDCProviderConfig[]> = {}
  
  Object.values(OIDC_PROVIDERS).forEach(provider => {
    if (!categorized[provider.category]) {
      categorized[provider.category] = []
    }
    categorized[provider.category].push(provider)
  })
  
  return categorized
}

export function getProviderById(id: string): OIDCProviderConfig | undefined {
  return OIDC_PROVIDERS[id]
}

export function validateProviderConfig(config: Partial<OIDCProviderConfig>): string[] {
  const errors: string[] = []
  
  if (!config.id) errors.push('Provider ID is required')
  if (!config.name) errors.push('Provider name is required')
  if (!config.displayName) errors.push('Display name is required')
  if (!config.wellKnownUrl) errors.push('Well-known URL is required')
  if (!config.defaultScopes?.length) errors.push('At least one default scope is required')
  
  return errors
}