'use client'

import Link from 'next/link'
import { Building2, Users, Bot, ArrowRight, Loader2, Shield } from 'lucide-react'
import { usePlatformSummary } from '../hooks/use-platform-summary'
import { cn } from '@/lib/utils'

const CARD_STYLE =
  'space-y-4 p-4 sm:p-5 rounded-xl bg-card border border-border shadow-md'

/**
 * SysAdmin-only strip showing platform-wide tenant, user, and template counts.
 * Mount only when the user has `system:admin`.
 */
export function PlatformStrip() {
  const { summary, isLoading } = usePlatformSummary(true)

  return (
    <section className={cn(CARD_STYLE)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="dashboard-icon-wrap p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">Platform administration</h2>
            <p className="text-xs text-muted-foreground truncate">
              Cross-tenant counts for system administrators
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading platform counts...</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          <Link
            href="/system-admin/tenants"
            className="group block min-w-0 rounded-lg p-3 -m-1 hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium uppercase tracking-wide">Tenants</span>
            </div>
            <div className="text-3xl sm:text-4xl font-light tabular-nums tracking-tight text-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">
              {summary.tenantCount}
            </div>
          </Link>
          <Link
            href="/system-admin/users"
            className="group block min-w-0 rounded-lg p-3 -m-1 hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium uppercase tracking-wide">Users</span>
            </div>
            <div className="text-3xl sm:text-4xl font-light tabular-nums tracking-tight text-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">
              {summary.userCount}
            </div>
          </Link>
          <Link
            href="/system-admin/agent-templates"
            className="group block min-w-0 rounded-lg p-3 -m-1 hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 text-muted-foreground min-w-0">
              <Bot className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium uppercase tracking-wide truncate">
                Agent templates
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-light tabular-nums tracking-tight text-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">
              {summary.agentTemplateCount}
            </div>
          </Link>
        </div>
      )}
    </section>
  )
}
