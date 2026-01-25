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
} from 'lucide-react';
import { DUMMY_TASKS } from '@/lib/data/dummy-tasks';
import { DUMMY_CONVERSATIONS } from '@/lib/data/dummy-conversations';
import { TASK_STATUS_CONFIG } from '@/lib/task-status-config';
import { cn } from '@/lib/utils';
import { ToastDemo } from '@/components/toast-demo';
import { useTenant } from '@/hooks/use-tenant';
import { useAgents } from '@/app/(dashboard)/agents/running/hooks/use-agents';
import { AgentStatusBadge } from '@/components/features/agents';
import { XiansTenantStats } from '@/lib/xians/types';

type TimePeriod = '7d' | '30d' | '90d';

export default function DashboardPage() {
  const { currentTenantId } = useTenant();
  const { agents: allAgents, isLoading: isLoadingAgents } = useAgents(currentTenantId);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const [tenantStats, setTenantStats] = useState<XiansTenantStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const activeConversations = DUMMY_CONVERSATIONS.filter((c) => c.status === 'active').length;

  // Get active agent instances from the API
  const activeAgents = allAgents.filter((agent) => agent.status === 'active');

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
        console.error('Error fetching tenant stats:', error);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your AI agent platform
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

      {/* Task Overview - Textual */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-medium text-foreground">Tasks overview</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {(['7d', '30d', '90d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={cn(
                  'px-2 py-1 rounded transition-colors',
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
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading task stats...</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your organization has{' '}
            <Link 
              href="/tasks?viewType=everyone&status=pending" 
              className="font-medium text-yellow-600 dark:text-yellow-500 hover:underline cursor-pointer"
            >
              {taskStats.pending} pending
            </Link>{' '}
            tasks awaiting review, with{' '}
            <span className="font-medium text-green-600 dark:text-green-500">{taskStats.completed} completed</span>, {' '}
            <span className="font-medium text-red-600 dark:text-red-500">{taskStats.cancelled} cancelled</span>, and{' '}
            <span className="font-medium text-orange-600 dark:text-orange-500">{taskStats.timedOut} timed out</span>.
            {' '}Total of <span className="font-medium text-foreground">{taskStats.total} tasks</span> in this period.
          </p>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 py-4">
        {/* Running Agents */}
        <div className="group">
          <div className="flex items-baseline gap-3 mb-1.5">
            <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
              {activeAgents.length}
            </div>
            <div className="h-8 w-0.5 bg-emerald-500/60 dark:bg-emerald-400/60" />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-foreground/80">Running Agents</div>
            <div className="text-xs text-muted-foreground">Currently online</div>
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

      {/* Main Content - Textual Layout */}
      <div className="grid gap-8 md:grid-cols-5">
        {/* Recent Activity - Textual Feed */}
        <div className="md:col-span-3 space-y-4 p-5 rounded-lg bg-muted/40">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-medium text-foreground">Recent Activity</h2>
          </div>
          
          <div className="space-y-3">
            {DUMMY_TASKS.slice(0, 6).map((task, idx) => (
              <div
                key={task.id}
                className="group cursor-pointer"
              >
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="inline-flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground inline" />
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {task.title}
                    </span>
                  </span>
                  {' '}·{' '}
                  <Badge
                    variant={TASK_STATUS_CONFIG[task.status].variant}
                    className={cn(
                      TASK_STATUS_CONFIG[task.status].colors.badge,
                      'inline-flex items-center h-5 text-xs'
                    )}
                  >
                    {TASK_STATUS_CONFIG[task.status].label}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 pl-5" suppressHydrationWarning>
                  by {task.createdBy.name} at {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border">
            <Link
              href="/tasks"
              className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              View all tasks
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Active Agents - Textual List */}
        <div className="md:col-span-2 space-y-4 p-5 rounded-lg bg-muted/40">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-medium text-foreground">Active Agents</h2>
          </div>

          {isLoadingAgents ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading agents...</span>
            </div>
          ) : activeAgents.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">
              No agents are currently active. Visit the{' '}
              <Link href="/agents/running" className="text-foreground hover:underline font-medium">
                agents page
              </Link>{' '}
              to activate some.
            </p>
          ) : (
            <div className="space-y-3">
              {activeAgents.slice(0, 5).map((agent) => (
                <div key={agent.id} className="group">
                  <div className="flex items-baseline gap-2">
                    <Bot className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/conversations/${agent.template}`}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {agent.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <AgentStatusBadge status={agent.status} size="xs" />
                        {agent.uptime && (
                          <span className="text-xs text-muted-foreground">
                            · {agent.uptime} uptime
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {activeAgents.length > 5 && (
                <p className="text-xs text-muted-foreground italic pt-2">
                  and {activeAgents.length - 5} more...
                </p>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <Link
              href="/agents/running"
              className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Manage all agents
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Temporary Toast Demo for Styling */}
      {/* <div className="mt-8">
        <ToastDemo />
      </div> */}
      </div>
    </div>
  );
}
