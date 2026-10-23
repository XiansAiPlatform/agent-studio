import Image from 'next/image'
import { Plug, Webhook } from 'lucide-react'
import { cn } from '@/lib/utils'

// Only list image files that exist in public/. Anything else falls back to a
// lucide icon so the browser never shows a broken-image placeholder.
const INTEGRATION_ICONS: Record<string, string> = {
  'slack': '/slack.png',
  'msteams': '/microsoft_teams.png',
  'teams': '/microsoft_teams.png',
}

const WEBHOOK_PROVIDERS = new Set(['webhook', 'builtin_webhook'])

const INTEGRATION_NAMES: Record<string, string> = {
  'slack': 'Slack',
  'msteams': 'Microsoft Teams',
  'teams': 'Microsoft Teams',
  'outlook': 'Outlook',
  'webhook': 'Custom Webhook',
  'builtin_webhook': 'Webhook',
  'oauth-mcp': 'OAuth MCP'
}

export function getConnectionDisplayName(providerId: string) {
  return INTEGRATION_NAMES[providerId] || providerId
}

interface ConnectionIconProps {
  providerId: string
  size: number
  className?: string
}

export function ConnectionIcon({ providerId, size, className }: ConnectionIconProps) {
  const iconUrl = INTEGRATION_ICONS[providerId]
  const style = { width: size, height: size }

  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt={getConnectionDisplayName(providerId)}
        width={size}
        height={size}
        className={cn('object-contain', className)}
      />
    )
  }

  const Icon = WEBHOOK_PROVIDERS.has(providerId) ? Webhook : Plug
  return <Icon style={style} className={cn('text-muted-foreground', className)} />
}
