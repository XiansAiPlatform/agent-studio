'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  ArrowRight,
  Activity,
  Users,
  ListTodo,
  BarChart3,
  Zap,
  MessageSquare,
  Calendar,
  Loader2,
  FileText,
} from 'lucide-react';
import { DUMMY_TASKS } from '@/lib/data/dummy-tasks';
import { DUMMY_CONVERSATIONS } from '@/lib/data/dummy-conversations';
import { TASK_STATUS_CONFIG } from '@/lib/task-status-config';
import { cn } from '@/lib/utils';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useAgents } from '@/app/(dashboard)/agents/running/hooks/use-agents';
import { AgentStatusBadge } from '@/components/features/agents';
import { LogLevelBadge } from '@/components/features/logs';
import { XiansTenantStats } from '@/lib/xians/types';
import { useLogs } from '@/app/(dashboard)/settings/logs/hooks/use-logs';
import { formatDistanceToNow } from 'date-fns';
import { showToast } from '@/lib/toast';

type TimePeriod = '7d' | '30d' | '90d';

export default function DashboardPage() {
  const { currentTenantId } = useTenant();
  const { user } = useAuth();
  const { agents: allAgents, isLoading: isLoadingAgents } = useAgents(currentTenantId);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const [tenantStats, setTenantStats] = useState<XiansTenantStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const activeConversations = DUMMY_CONVERSATIONS.filter((c) => c.status === 'active').length;

  // Get active agent instances from the API
  const activeAgents = allAgents.filter((agent) => agent.status === 'active');

  // Fetch recent logs for activity feed
  const { logs: recentLogs, isLoading: isLoadingLogs } = useLogs(
    currentTenantId,
    { pageSize: 10, page: 1 }, // Get 10 most recent logs
    Boolean(currentTenantId) && Boolean(user)
  );

  // Calculate date range based on time period
  const getDateRange = (period: TimePeriod) => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  // Fetch tenant stats when tenant or time period changes
  useEffect(() => {
    if (!currentTenantId) return;

    const fetchTenantStats = async () => {
      setIsLoadingStats(true);
      try {
        const { startDate, endDate } = getDateRange(timePeriod);
        
        // Call Next.js API route
        const params = new URLSearchParams({
          startDate,
          endDate,
        });
        
        const response = await fetch(`/api/tenants/${currentTenantId}/stats?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch tenant stats');
        }
        
        const stats = await response.json();
        setTenantStats(stats);
      } catch (error) {
        showToast.error({
          title: 'Failed to fetch tenant stats',
          description: error instanceof Error ? error.message : 'An error occurred while loading dashboard statistics',
        });
        // Fallback to default values on error
        setTenantStats({
          tasks: {
            pending: 0,
            completed: 0,
            timedOut: 0,
            cancelled: 0,
            total: 0,
          },
          messages: {
            activeUsers: 0,
            totalMessages: 0,
          },
        });
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchTenantStats();
  }, [currentTenantId, timePeriod]);

  // Extract stats from API or use defaults
  const taskStats = tenantStats?.tasks ?? {
    pending: 0,
    completed: 0,
    timedOut: 0,
    cancelled: 0,
    total: 0,
  };
  const messageStats = tenantStats?.messages ?? {
    activeUsers: 0,
    totalMessages: 0,
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Welcome, {user?.name || user?.email || 'User'}!
          </h1>
          <p className="text-base text-muted-foreground">
            Let's get started with your AI agent team.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href="/tasks?status=pending">
              <ListTodo className="mr-2 h-4 w-4" />
              My Pending Tasks
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/agents/running">
              <Bot className="mr-2 h-4 w-4" />
              Meet Agents
            </Link>
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-medium text-foreground">Organizational Overview</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {(['7d', '30d', '90d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={cn(
                  'px-3 py-1.5 rounded transition-colors',
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {/* Pending Tasks */}
            <Link href="/tasks?viewType=everyone&status=pending" className="group block">
              <div className="flex items-baseline gap-3 mb-1.5">
                <div className="text-5xl font-light tabular-nums tracking-tight text-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">
                  {taskStats.pending}
                </div>
                <div className="h-8 w-0.5 bg-yellow-500/60 dark:bg-yellow-400/60" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground/80 group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">Pending Tasks</div>
                <div className="text-xs text-muted-foreground">Awaiting review</div>
              </div>
            </Link>

            {/* Completed Tasks */}
            <div className="group">
              <div className="flex items-baseline gap-3 mb-1.5">
                <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                  {taskStats.completed}
                </div>
                <div className="h-8 w-0.5 bg-green-500/60 dark:bg-green-400/60" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground/80">Completed Tasks</div>
                <div className="text-xs text-muted-foreground">In this period</div>
              </div>
            </div>

            

            {/* Active Users */}
            <div className="group">
              <div className="flex items-baseline gap-3 mb-1.5">
                <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                  {messageStats.activeUsers}
                </div>
                <div className="h-8 w-0.5 bg-blue-500/60 dark:bg-blue-400/60" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground/80">Active Users</div>
                <div className="text-xs text-muted-foreground">In this period</div>
              </div>
            </div>

            {/* Total Messages */}
            <div className="group">
              <div className="flex items-baseline gap-3 mb-1.5">
                <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                  {messageStats.totalMessages}
                </div>
                <div className="h-8 w-0.5 bg-purple-500/60 dark:bg-purple-400/60" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground/80">Total Messages</div>
                <div className="text-xs text-muted-foreground">Exchanged</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Textual Layout */}
      <div className="grid gap-8 md:grid-cols-5">
        {/* Recent Activity - Logs Feed */}
        <div className="md:col-span-3 space-y-4 p-5 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">What's Happening</h2>
                <p className="text-xs text-muted-foreground">Live updates from your agents</p>
              </div>
            </div>
            {!isLoadingLogs && recentLogs.length > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
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
              <div className="p-4 rounded-full bg-muted/50">
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
                    {(
                      <LogLevelBadge level={log.level} className="mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">
                        {log.message.length > 100 ? `${log.message.substring(0, 100)}...` : log.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {log.agent && (
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Bot className="h-3 w-3" />
                            {log.activation || log.agent}
                          </span>
                        )}
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-muted-foreground/80" suppressHydrationWarning>
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

        {/* Active Agents - Textual List */}
        <div className="md:col-span-2 space-y-4 p-5 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Your Team</h2>
                <p className="text-xs text-muted-foreground">Agents working for you</p>
              </div>
            </div>
            {!isLoadingAgents && activeAgents.length > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
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
              <div className="p-4 rounded-full bg-muted/50">
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
                    <div className="p-1 rounded bg-primary/10 mt-0.5">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/agents/running?agentName=${encodeURIComponent(agent.template || agent.name)}&activationName=${encodeURIComponent(agent.name)}`}
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
