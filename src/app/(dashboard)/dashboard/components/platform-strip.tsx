'use client'

import Link from 'next/link'
import { Building2, Users, Bot } from 'lucide-react'
import { usePlatformSummary } from '../hooks/use-platform-summary'
import { cn } from '@/lib/utils'

/**
 * SysAdmin-only thin strip — platform-wide counts without a heavy card.
 * Mount only when the user has `system:admin`.
 */
export function PlatformStrip() {
  const { summary, isLoading } = usePlatformSummary(true)

  const items = [
    {
      href: '/system-admin/tenants',
      label: 'Tenants',
      icon: Building2,
      value: summary.tenantCount,
    },
    {
      href: '/system-admin/users',
      label: 'Users',
      icon: Users,
      value: summary.userCount,
    },
    {
      href: '/system-admin/agent-templates',
      label: 'Templates',
      icon: Bot,
      value: summary.agentTemplateCount,
    },
  ] as const

  return (
    <section className="border-y border-border/70 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground shrink-0">
          Platform
        </p>

        {isLoading ? (
          <div className="flex flex-1 gap-6 sm:gap-8 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-5 w-20 rounded bg-muted/50" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:gap-x-8">
            {items.map(({ href, label, icon: Icon, value }) => (
              <Link
                key={href}
                href={href}
                className="group inline-flex items-baseline gap-2 transition-colors"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 translate-y-px" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {label}
                </span>
                <span
                  className={cn(
                    'text-sm font-medium tabular-nums text-foreground',
                    'group-hover:text-foreground/70 transition-colors'
                  )}
                >
                  {value}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
