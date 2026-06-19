'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  ArrowRight,
  Activity,
  ListTodo,
  BarChart3,
  Zap,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useAgents } from '@/app/(dashboard)/agents/running/hooks/use-agents';
import { AgentStatusBadge } from '@/components/features/agents';
import { LogLevelBadge } from '@/components/features/logs';
import { useLogs } from '@/app/(dashboard)/settings/logs/hooks/use-logs';
import { useTenantStats, type TimePeriod } from './hooks/use-tenant-stats';
import { formatDistanceToNow } from 'date-fns';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_PERIODS: readonly TimePeriod[] = ['7d', '30d', '90d'];

const CARD_STYLE =
  'space-y-4 p-4 sm:p-5 rounded-xl bg-card border border-border shadow-md';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateMessage(message: string, maxLength = 100): string {
  return message.length > maxLength ? `${message.slice(0, maxLength)}...` : message;
}

function getAgentDetailLink(agent: { template?: string; name: string }): string {
  const params = new URLSearchParams({
    agentName: agent.template || agent.name,
    activationName: agent.name,
  });
  return `/agents/running?${params}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MetricCardProps {
  value: number;
  label: string;
  description: string;
  accentColor: string;
  href?: string;
}

function MetricCard({ value, label, description, accentColor, href }: MetricCardProps) {
  const content = (
    <>
      <div className="flex items-baseline gap-3 mb-1.5 min-w-0">
        <div
          className={cn(
            'text-4xl sm:text-5xl font-light tabular-nums tracking-tight text-foreground truncate',
            href && 'group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors'
          )}
        >
          {value}
        </div>
        <div className={cn('h-8 w-0.5 shrink-0', accentColor)} />
      </div>
      <div className="space-y-0.5 min-w-0">
        <div
          className={cn(
            'text-sm font-medium text-foreground/80 truncate',
            href && 'group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors'
          )}
        >
          {label}
        </div>
        <div className="text-xs text-muted-foreground truncate">{description}</div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group block min-w-0">
        {content}
      </Link>
    );
  }

  return <div className="group min-w-0">{content}</div>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { currentTenantId } = useTenant();
  const { user } = useAuth();
  const { agents: allAgents, isLoading: isLoadingAgents } = useAgents(currentTenantId);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');

  const { stats, isLoading: isLoadingStats } = useTenantStats(
    timePeriod,
    Boolean(currentTenantId)
  );
  const { logs: recentLogs, isLoading: isLoadingLogs } = useLogs(
    { pageSize: 10, page: 1 },
    Boolean(currentTenantId) && Boolean(user)
  );

  const activeAgents = allAgents.filter((agent) => agent.status === 'active');
  const { tasks: taskStats, messages: messageStats } = stats;

  return (
    <div className="dashboard-page min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Page Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
          <div className="space-y-1.5 sm:space-y-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
              Welcome, {user?.name || user?.email || 'User'}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Let's get started with your AI agent team.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/tasks?status=pending">
                <ListTodo className="mr-2 h-4 w-4" />
                My Pending Tasks
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/agents/running">
                <Bot className="mr-2 h-4 w-4" />
                Meet Agents
              </Link>
            </Button>
          </div>
        </header>

        {/* Performance Metrics */}
        <section className="space-y-4 pt-4 sm:pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-medium text-foreground">Organizational Overview</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {TIME_PERIODS.map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={cn(
                    'min-h-9 px-3 py-1.5 rounded transition-colors',
                    timePeriod === period
                      ? 'text-foreground font-medium underline underline-offset-4'
                      : 'hover:text-foreground'
                  )}
                >
                  {period.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {isLoadingStats ? (
            <div className="flex items-center gap-2 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading statistics...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
              <MetricCard
                value={taskStats.pending}
                label="Pending Tasks"
                description="Awaiting review"
                accentColor="bg-yellow-500/60 dark:bg-yellow-400/60"
                href="/tasks?viewType=everyone&status=pending"
              />
              <MetricCard
                value={taskStats.completed}
                label="Completed Tasks"
                description="In this period"
                accentColor="bg-green-500/60 dark:bg-green-400/60"
              />
              <MetricCard
                value={messageStats.activeUsers}
                label="Active Users"
                description="In this period"
                accentColor="bg-blue-500/60 dark:bg-blue-400/60"
              />
              <MetricCard
                value={messageStats.totalMessages}
                label="Total Messages"
                description="Exchanged"
                accentColor="bg-purple-500/60 dark:bg-purple-400/60"
              />
            </div>
          )}
        </section>

        {/* Main Content */}
        <div className="grid gap-6 sm:gap-8 md:grid-cols-5">
          {/* Recent Activity */}
          <div className={cn('md:col-span-3 min-w-0', CARD_STYLE)}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="dashboard-icon-wrap p-1.5 rounded-lg bg-primary/10 shrink-0">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-foreground truncate">What's Happening</h2>
                  <p className="text-xs text-muted-foreground truncate">Live updates from your agents</p>
                </div>
              </div>
              {!isLoadingLogs && recentLogs.length > 0 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 shrink-0">
                  {recentLogs.length} recent
                </Badge>
              )}
            </div>

            {isLoadingLogs ? (
              <div className="flex items-center gap-2 py-8">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Checking in on your agents...</span>
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="dashboard-icon-wrap dashboard-icon-wrap--empty p-4 rounded-full bg-muted/50">
                  <Zap className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Activity logs will appear here as your agents start working
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link href="/agents/running">
                    <Bot className="mr-2 h-3.5 w-3.5" />
                    View Active Agents
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.slice(0, 8).map((log, index) => (
                  <div
                    key={log.id}
                    className="-mx-2 px-2 py-2 rounded-lg"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-2.5">
                      <LogLevelBadge level={log.level} className="mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed break-words">
                          {truncateMessage(log.message)}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground min-w-0">
                          {log.agent && (
                            <span className="inline-flex items-center gap-1 font-medium min-w-0 max-w-full">
                              <Bot className="h-3 w-3 shrink-0" />
                              <span className="truncate">{log.activation || log.agent}</span>
                            </span>
                          )}
                          <span className="text-muted-foreground/50">•</span>
                          <span className="text-muted-foreground/80 truncate" suppressHydrationWarning>
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-border/50">
              <Link
                href="/settings/logs"
                className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1.5 group transition-all"
              >
                <span>Explore all activity</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Active Agents */}
          <div className={cn('md:col-span-2 min-w-0', CARD_STYLE)}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="dashboard-icon-wrap p-1.5 rounded-lg bg-primary/10 shrink-0">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-foreground truncate">Your Team</h2>
                  <p className="text-xs text-muted-foreground truncate">Agents working for you</p>
                </div>
              </div>
              {!isLoadingAgents && activeAgents.length > 0 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 shrink-0">
                  {activeAgents.length} active
                </Badge>
              )}
            </div>

            {isLoadingAgents ? (
              <div className="flex items-center gap-2 py-8">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Gathering your team...</span>
              </div>
            ) : activeAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="dashboard-icon-wrap dashboard-icon-wrap--empty p-4 rounded-full bg-muted/50">
                  <Bot className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Let's get your team started!
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Activate agents to start automating tasks
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link href="/settings/agent-store">
                    <Zap className="mr-2 h-3.5 w-3.5" />
                    Activate New Agents
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {activeAgents.slice(0, 5).map((agent, index) => (
                  <div
                    key={agent.id}
                    className="group hover:bg-accent/50 -mx-2 px-2 py-2 rounded-lg transition-all duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="dashboard-icon-wrap dashboard-icon-wrap--sm p-1 rounded bg-primary/10 mt-0.5">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={getAgentDetailLink(agent)}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block group-hover:translate-x-0.5 transition-transform"
                        >
                          {agent.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <AgentStatusBadge status={agent.status} size="xs" />
                          {agent.uptime && (
                            <>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="text-xs text-muted-foreground/80">
                                {agent.uptime} uptime
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {activeAgents.length > 5 && (
                  <p className="text-xs text-muted-foreground/80 pt-2 pl-2">
                    + {activeAgents.length - 5} more agent{activeAgents.length - 5 > 1 ? 's' : ''} active
                  </p>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-border/50">
              <Link
                href="/agents/running"
                className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1.5 group transition-all"
              >
                <span>Meet your full team</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
