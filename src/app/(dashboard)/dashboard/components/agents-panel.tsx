import Link from 'next/link'
import { ArrowRight, Bot, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgentStatusBadge } from '@/components/features/agents'
import type { AgentStatus } from '@/lib/agent-status-config'
import { cn } from '@/lib/utils'
import { PANEL_STYLE } from './panel-style'

type AgentListItem = {
  id: string
  name: string
  template?: string
  status: AgentStatus
  uptime?: string | null
}

interface AgentsPanelProps {
  agents: AgentListItem[]
  isLoading: boolean
  canActivateAgents: boolean
  /** When true, panel spans full width (no activity column) */
  fullWidth?: boolean
}

function getAgentDetailLink(agent: { template?: string; name: string }): string {
  const params = new URLSearchParams({
    agentName: agent.template || agent.name,
    activationName: agent.name,
  })
  return `/agents/running?${params}`
}

export function AgentsPanel({
  agents,
  isLoading,
  canActivateAgents,
  fullWidth = false,
}: AgentsPanelProps) {
  return (
    <div
      className={cn(PANEL_STYLE, 'min-w-0', fullWidth ? 'md:col-span-5' : 'md:col-span-2')}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-foreground">Your agents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Currently active</p>
        </div>
        {!isLoading && agents.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {agents.length} active
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 py-2 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="h-4 w-4 rounded bg-muted/50 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-2/3 rounded bg-muted/50" />
                <div className="h-3 w-1/4 rounded bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <Bot className="h-6 w-6 text-muted-foreground/50" />
          <div className="text-center space-y-1">
            <p className="text-sm text-foreground">No active agents</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Activate agents to start automating tasks
            </p>
          </div>
          {canActivateAgents && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/agent-store">
                <Zap className="mr-2 h-3.5 w-3.5" />
                Activate agents
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-0.5">
          {agents.slice(0, 5).map((agent) => (
            <div
              key={agent.id}
              className="group hover:bg-muted/40 -mx-2 px-2 py-2 rounded-md transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <Bot className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link
                    href={getAgentDetailLink(agent)}
                    className="text-sm font-medium text-foreground hover:text-foreground/70 transition-colors truncate block"
                  >
                    {agent.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <AgentStatusBadge status={agent.status} size="xs" />
                    {agent.uptime && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground/80">{agent.uptime} uptime</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {agents.length > 5 && (
            <p className="text-xs text-muted-foreground/80 pt-2 pl-1">
              + {agents.length - 5} more
            </p>
          )}
        </div>
      )}

      <div className="pt-3 border-t border-border/60">
        <Link
          href="/agents/running"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 group transition-colors"
        >
          <span>All agents</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
