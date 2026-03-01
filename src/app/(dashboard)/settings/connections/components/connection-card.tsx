import { cn } from '@/lib/utils'
import { MoreHorizontal, Webhook } from 'lucide-react'
import Image from 'next/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OIDCConnection, ConnectionStatus } from '../types'

// Icon mapping for integration types
const INTEGRATION_ICONS: Record<string, string> = {
  'slack': '/slack.png',
  'msteams': '/microsoft_teams.png',
  'teams': '/microsoft_teams.png',
  'outlook': '/outlook.png',
  'webhook': '/webhook.png',
  'builtin_webhook': '/webhook.png'
}

const INTEGRATION_NAMES: Record<string, string> = {
  'slack': 'Slack',
  'msteams': 'Microsoft Teams',
  'teams': 'Microsoft Teams',
  'outlook': 'Outlook',
  'webhook': 'Custom Webhook',
  'builtin_webhook': 'Webhook'
}

interface ConnectionCardProps {
  connection: OIDCConnection
  onEdit: (connection: OIDCConnection) => void
  onDelete: (connectionId: string) => void
  onTest: (connectionId: string) => void
  onToggleActive: (connectionId: string, active: boolean) => void
  onViewUsage: (connectionId: string) => void
  onAuthorize?: (connectionId: string) => void
  onClick?: (connectionId: string) => void
}

const statusText: Record<ConnectionStatus, { text: string; color: string }> = {
  connected: { text: 'active', color: 'text-emerald-600' },
  expired: { text: 'expired', color: 'text-amber-600' },
  error: { text: 'error', color: 'text-red-600' },
  pending: { text: 'pending', color: 'text-slate-500' },
  authorizing: { text: 'authorizing', color: 'text-blue-600' },
  disabled: { text: 'disabled', color: 'text-slate-400' },
  draft: { text: 'draft', color: 'text-slate-500' }
}

export function ConnectionCard({ 
  connection, 
  onEdit, 
  onDelete, 
  onTest, 
  onToggleActive, 
  onViewUsage,
  onAuthorize,
  onClick 
}: ConnectionCardProps) {
  const status = statusText[connection.status]
  const iconUrl = INTEGRATION_ICONS[connection.providerId] || '/default-icon.png'
  const displayName = INTEGRATION_NAMES[connection.providerId] || connection.providerId

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  return (
    <div 
      onClick={() => onClick?.(connection.id)}
      className={cn(
        "group relative p-6 rounded-xl border-0 transition-all duration-200",
        connection.isActive 
          ? "bg-white/80 hover:bg-white" 
          : "bg-slate-100/50 hover:bg-slate-100/70",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 mt-0.5 flex items-center justify-center w-10 h-10",
          !connection.isActive && "opacity-50 grayscale"
        )}>
          {connection.providerId === 'builtin_webhook' ? (
            <Webhook className="h-10 w-10 text-slate-500" />
          ) : (
            <Image 
              src={iconUrl} 
              alt={displayName}
              width={40}
              height={40}
              className="object-contain"
            />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Connection name */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "text-base font-normal",
              connection.isActive ? "text-slate-900" : "text-slate-500"
            )}>
              {connection.name}
            </h3>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded",
              connection.isActive 
                ? "text-emerald-600 bg-emerald-50/50" 
                : "text-slate-400 bg-slate-200/50"
            )}>
              {connection.isActive ? 'enabled' : 'disabled'}
            </span>
          </div>
          
          {/* Type and Date */}
          <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
            <span>{displayName}</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs">created {formatDate(connection.createdAt)}</span>
            {connection.status !== 'connected' && connection.isActive && (
              <>
                <span className="text-slate-300">•</span>
                <span className={cn("text-xs", status.color)}>{status.text}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-all p-1 flex-shrink-0">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {['pending', 'expired', 'error'].includes(connection.status) && onAuthorize && (
              <>
                <DropdownMenuItem onClick={() => onAuthorize(connection.id)}>
                  Authorize
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onTest(connection.id)}>
              Test
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewUsage(connection.id)}>
              Usage
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(connection)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onToggleActive(connection.id, !connection.isActive)}>
              {connection.isActive ? 'Disable' : 'Enable'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(connection.id)}
              className="text-red-600 focus:text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}