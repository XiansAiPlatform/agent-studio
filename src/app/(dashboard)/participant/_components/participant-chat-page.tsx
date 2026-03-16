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
  const { activations: allActivations, isLoading } = useActivations(currentTenantId)
  const activations = allActivations.filter((a) => a.status === 'active')
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
      {/* Top bar */}
      <div className="border-b border-border px-6 py-3 shrink-0">
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
        <div className="w-full max-w-2xl mb-10 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Bot className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl text-foreground tracking-tight">
            Hello, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Choose an agent below to start a conversation.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Loader2 className="h-7 w-7 animate-spin text-primary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Loading agents...</p>
          </div>
        ) : activations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <MessageSquare className="h-8 w-8 text-primary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No agents available. Use the menu to browse more.
            </p>
          </div>
        ) : activations.length === 1 ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Loader2 className="h-7 w-7 animate-spin text-primary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Opening conversation...</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl space-y-8">
            {Object.values(groupedByAgent).map(({ agentName, activations: agentActivations }) => (
              <div key={agentName} className="space-y-3">
                <div className="flex items-center gap-2 px-1 mb-1">
                  <span className="h-3.5 w-0.5 rounded-full bg-primary" />
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest">
                    {agentName}
                  </h3>
                </div>
                <div className="space-y-3">
                  {agentActivations.map((activation) => (
                    <button
                      key={activation.id}
                      type="button"
                      onClick={() => handleActivationClick(activation.agentName, activation.name)}
                      className={cn(
                        'w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left',
                        'border border-border bg-card',
                        'hover:bg-primary/[0.04] hover:border-primary/40 hover:shadow-md',
                        'transition-all duration-200'
                      )}
                    >
                      <div className="agent-icon-avatar h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate text-sm">
                          {activation.name}
                        </p>
                        {activation.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {activation.description}
                          </p>
                        )}
                      </div>
                      {activation.status === 'active' && (
                        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0 ring-2 ring-green-500/20" />
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
