import { NextResponse } from 'next/server'
import { createXiansClient, XiansApiError } from '@/lib/xians'

/**
 * TEMPORARY FALLBACK: Integration types to use when backend endpoint is not available
 * TODO: Remove this once backend implements GET /api/v1/admin/integrations/metadata/types
 */
const FALLBACK_INTEGRATION_TYPES = [
  {
    platformId: 'slack',
    displayName: 'Slack',
    description: 'Team collaboration and messaging platform',
    icon: 'slack',
    requiredConfigurationFields: [
      {
        fieldName: 'appId',
        displayName: 'App ID',
        description: 'Slack App ID',
        isSecret: false,
      },
      {
        fieldName: 'teamId',
        displayName: 'Team ID',
        description: 'Slack Workspace Team ID',
        isSecret: false,
      },
      {
        fieldName: 'botToken',
        displayName: 'Bot Token',
        description: 'OAuth Bot User Access Token',
        isSecret: true,
      },
      {
        fieldName: 'incomingWebhookUrl',
        displayName: 'Incoming Webhook URL',
        description: 'URL for sending messages to Slack',
        isSecret: true,
      },
      {
        fieldName: 'outgoingWebhookUrl',
        displayName: 'Outgoing Webhook URL',
        description: 'URL for receiving messages from Slack',
        isSecret: false,
      },
    ],
    capabilities: [
      'bidirectional_messaging',
      'rich_formatting',
      'interactive_components',
      'file_sharing',
    ],
    webhookEndpoint: '/api/apps/slack/events/{integrationId}/{webhookSecret}',
    documentationUrl: 'https://api.slack.com/docs',
  },
  {
    platformId: 'msteams',
    displayName: 'Microsoft Teams',
    description: 'Enterprise team collaboration platform',
    icon: 'teams',
    requiredConfigurationFields: [
      {
        fieldName: 'serviceUrl',
        displayName: 'Service URL',
        description: 'Bot Framework Service URL',
        isSecret: false,
      },
      {
        fieldName: 'outgoingWebhookUrl',
        displayName: 'Outgoing Webhook URL',
        description: 'URL for receiving messages from Teams',
        isSecret: false,
      },
    ],
    capabilities: [
      'bidirectional_messaging',
      'rich_formatting',
      'adaptive_cards',
    ],
    webhookEndpoint: '/api/apps/msteams/webhook/{integrationId}/{webhookSecret}',
    documentationUrl: 'https://docs.microsoft.com/en-us/microsoftteams/platform/',
  },
]

/**
 * GET /api/integrations/types
 * Fetches available integration types from the backend API
 * Falls back to hardcoded types if backend endpoint is not implemented (404)
 */
export async function GET() {
  try {
    const endpoint = '/api/v1/admin/integrations/metadata/types'
    console.log('[API /integrations/types] Fetching integration types from backend')
    console.log('[API /integrations/types] Full URL:', `${process.env.XIANS_SERVER_URL}${endpoint}`)
    
    // Use Xians SDK client which handles authentication automatically
    const client = createXiansClient()
    
    // Call the backend API endpoint
    const data = await client.get<any>(endpoint)
    
    console.log('[API /integrations/types] ✅ Successfully fetched', Array.isArray(data) ? data.length : 0, 'integration types from backend')
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API /integrations/types] ❌ Error:', error)
    
    // If backend endpoint returns 404, use fallback data
    if (error instanceof XiansApiError && error.status === 404) {
      console.warn('[API /integrations/types] ⚠️  Backend endpoint not implemented yet (404)')
      console.warn('[API /integrations/types] ⚠️  Using temporary fallback data')
      console.warn('[API /integrations/types] ⚠️  TODO: Implement GET /api/v1/admin/integrations/metadata/types in backend')
      return NextResponse.json(FALLBACK_INTEGRATION_TYPES)
    }
    
    // For other errors, return error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch integration types from backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
