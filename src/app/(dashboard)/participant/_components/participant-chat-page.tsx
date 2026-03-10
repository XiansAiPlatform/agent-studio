'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Bot, PanelLeft, Loader2, MessageSquare } from 'lucide-react'
import { useParticipantLayout } from '@/contexts/participant-layout-context'
import { useTenant } from '@/hooks/use-tenant'
import { useActivations } from '@/app/(dashboard)/conversations/hooks'
import { cn } from '@/lib/utils'

function getUserDisplayName(session: { user?: { name?: string | null; email?: string | null } } | null): string {
  const name = session?.user?.name
  if (name && name.trim()) return name.trim()
  const email = session?.user?.email
  if (email) return email.split('@')[0] || 'there'
  return 'there'
}

/**
 * Participant landing page - centered list of agents to start a conversation
 */
export function ParticipantChatPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { onOpenMenu } = useParticipantLayout()
  const { currentTenantId } = useTenant()
  const { activations, isLoading } = useActivations(currentTenantId)
  const displayName = getUserDisplayName(session)

  const groupedByAgent = activations.reduce<
    Record<string, { agentName: string; activations: typeof activations }>
  >((acc, activation) => {
    const { agentName } = activation
    if (!acc[agentName]) acc[agentName] = { agentName, activations: [] }
    acc[agentName].activations.push(activation)
    return acc
  }, {})

  const handleActivationClick = (agentName: string, activationName: string) => {
    router.push(
      `/conversations/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}?topic=general-discussions`
    )
  }

  // When only one activation exists, go directly to its chat
  useEffect(() => {
    if (!isLoading && activations.length === 1) {
      const { agentName, name: activationName } = activations[0]
      router.replace(
        `/conversations/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}?topic=general-discussions`
      )
    }
  }, [isLoading, activations, router])

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Agent bar with menu button */}
      <div className="border-b border-border/50 bg-card px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background hover:bg-muted/80 transition-colors"
              aria-label="Open conversation menu"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          <span className="text-sm text-muted-foreground font-medium">
            Start a conversation
          </span>
        </div>
      </div>

      {/* Centered agent list */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 overflow-y-auto">
        <div className="w-full max-w-md mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Hello, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Welcome! Choose an agent below to start a conversation.
          </p>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading agents...</p>
          </div>
        ) : activations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No agents available. Use the menu to browse more.
            </p>
          </div>
        ) : activations.length === 1 ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Opening conversation...</p>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-6">
            {Object.values(groupedByAgent).map(({ agentName, activations: agentActivations }) => (
              <div key={agentName} className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                  {agentName}
                </h3>
                <div className="space-y-1">
                  {agentActivations.map((activation) => (
                    <button
                      key={activation.id}
                      type="button"
                      onClick={() => handleActivationClick(activation.agentName, activation.name)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl',
                        'border border-border/50 bg-card hover:bg-muted/50 hover:border-primary/30',
                        'transition-colors text-left'
                      )}
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {activation.name}
                        </p>
                        {activation.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {activation.description}
                          </p>
                        )}
                      </div>
                      {activation.status === 'active' && (
                        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
