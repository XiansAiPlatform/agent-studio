'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTenant } from '@/hooks/use-tenant'
import { useAuth } from '@/hooks/use-auth'
import { useCan } from '@/hooks/use-permissions'
import { useAgents } from '@/app/(dashboard)/agents/running/hooks/use-agents'
import { useLogs } from '@/app/(dashboard)/settings/logs/hooks/use-logs'
import { useTenantStats, type TimePeriod } from './hooks/use-tenant-stats'
import { useMyPendingTaskCount } from './hooks/use-my-pending-task-count'
import { useTenantUserSummary } from './hooks/use-tenant-user-summary'
import { PlatformStrip } from './components/platform-strip'
import { MetricCard, MetricCardSkeleton } from './components/metric-card'
import { ActivityPanel } from './components/activity-panel'
import { AgentsPanel } from './components/agents-panel'

const TIME_PERIODS: readonly { value: TimePeriod; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
]

function periodCaption(period: TimePeriod): string {
  const match = TIME_PERIODS.find((p) => p.value === period)
  return match ? `Last ${match.label}` : ''
}

export default function DashboardPage() {
  const { currentTenantId } = useTenant()
  const { user } = useAuth()
  const canViewSettings = useCan('settings:view')
  const canManageUsers = useCan('tenant:manage-users')
  const canSystemAdmin = useCan('system:admin')

  const { agents: allAgents, isLoading: isLoadingAgents } = useAgents(currentTenantId)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d')

  const statsEnabled = Boolean(currentTenantId) && canViewSettings
  const { stats, isLoading: isLoadingStats } = useTenantStats(timePeriod, statsEnabled)
  const { logs: recentLogs, isLoading: isLoadingLogs } = useLogs(
    { pageSize: 10, page: 1 },
    statsEnabled && Boolean(user)
  )
  const { count: pendingTaskCount } = useMyPendingTaskCount(Boolean(currentTenantId))
  const { summary: userSummary, isLoading: isLoadingUsers } = useTenantUserSummary(
    Boolean(currentTenantId) && canManageUsers
  )

  const activeAgents = allAgents.filter((agent) => agent.status === 'active')
  const { tasks: taskStats, messages: messageStats } = stats
  const isLoadingOverview = isLoadingStats || (canManageUsers && isLoadingUsers)
  const messagesCaption = periodCaption(timePeriod)

  return (
    <div className="dashboard-page min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 space-y-8">
        {/* Header — welcome + one primary action */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Welcome, {user?.name || user?.email || 'User'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Your workspace overview
            </p>
          </div>
          <Button variant="outline" asChild className="w-full sm:w-auto shrink-0">
            <Link href="/tasks?status=pending">
              <ListTodo className="mr-2 h-4 w-4" />
              My tasks
              {pendingTaskCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 min-w-5 px-1.5 text-xs tabular-nums font-normal"
                >
                  {pendingTaskCount}
                </Badge>
              )}
            </Link>
          </Button>
        </header>

        {canSystemAdmin && <PlatformStrip />}

        {/* Organizational overview */}
        {canViewSettings && (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 className="text-base font-medium text-foreground">Overview</h2>
              <div
                className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
                role="group"
                aria-label="Time period for message statistics"
              >
                {TIME_PERIODS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTimePeriod(value)}
                    aria-pressed={timePeriod === value}
                    className={cn(
                      'min-h-8 px-2.5 py-1 rounded-md transition-colors',
                      timePeriod === value
                        ? 'text-foreground font-medium underline underline-offset-4'
                        : 'hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingOverview ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <MetricCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                <MetricCard
                  value={taskStats.pending}
                  label="Pending tasks"
                  description="Awaiting review"
                  href="/tasks?viewType=everyone&status=pending"
                />
                <MetricCard
                  value={activeAgents.length}
                  label="Active agents"
                  description="Currently running"
                  href="/agents/running"
                />
                {canManageUsers ? (
                  <MetricCard
                    value={userSummary.totalCount}
                    label="Users"
                    description="In this tenant"
                    href="/tenant-settings/users"
                  />
                ) : (
                  <MetricCard
                    value={messageStats.activeUsers}
                    label="Active users"
                    description="Messaged in period"
                    caption={messagesCaption}
                  />
                )}
                <MetricCard
                  value={messageStats.totalMessages}
                  label="Messages"
                  description="Exchanged in period"
                  caption={messagesCaption}
                />
              </div>
            )}

            {canManageUsers && (
              <p className="text-xs text-muted-foreground">
                <Link
                  href="/tenant-settings/users"
                  className="hover:text-foreground transition-colors"
                >
                  Manage users
                </Link>
                <span className="mx-2 text-muted-foreground/40">·</span>
                <Link
                  href="/tenant-settings/branding"
                  className="hover:text-foreground transition-colors"
                >
                  Branding
                </Link>
              </p>
            )}
          </section>
        )}

        {/* Activity + agents */}
        <div className="grid gap-6 md:grid-cols-5">
          {canViewSettings && (
            <div className="md:col-span-3 min-w-0">
              <ActivityPanel logs={recentLogs} isLoading={isLoadingLogs} />
            </div>
          )}
          <AgentsPanel
            agents={activeAgents}
            isLoading={isLoadingAgents}
            canActivateAgents={canViewSettings}
            fullWidth={!canViewSettings}
          />
        </div>
      </div>
    </div>
  )
}
