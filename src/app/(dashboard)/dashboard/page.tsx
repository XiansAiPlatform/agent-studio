'use client';

import { useState } from 'react';
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

type TimePeriod = '7d' | '30d' | '90d' | 'all';

export default function DashboardPage() {
  const { currentTenantId } = useTenant();
  const { agents: allAgents, isLoading: isLoadingAgents } = useAgents(currentTenantId);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const pendingTasks = DUMMY_TASKS.filter((t) => t.status === 'pending');
  const approvedTasks = DUMMY_TASKS.filter((t) => t.status === 'approved');
  const rejectedTasks = DUMMY_TASKS.filter((t) => t.status === 'rejected');
  const totalTasks = DUMMY_TASKS.length;
  const activeConversations = DUMMY_CONVERSATIONS.filter((c) => c.status === 'active').length;

  // Get active agent instances from the API
  const activeAgents = allAgents.filter((agent) => agent.status === 'active');

  // Calculate approval rate
  const approvalRate = totalTasks > 0 
    ? Math.round((approvedTasks.length / totalTasks) * 100) 
    : 0;

  // Agent Performance Metrics - using real agent data
  const totalAgents = allAgents.length;
  const agentUtilization = totalAgents > 0 ? Math.round((activeAgents.length / totalAgents) * 100) : 0;
  const completedTasks = approvedTasks.length + rejectedTasks.length;
  const successRate = completedTasks > 0 ? Math.round((approvedTasks.length / completedTasks) * 100) : 0;
  const avgResponseTime = 2.3; // This would be calculated from actual data
  const tasksPerAgent = totalAgents > 0 ? (totalTasks / totalAgents).toFixed(1) : '0';

  return (
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
          <Button variant="outline" asChild>
            <Link href="/tasks">
              <ListTodo className="mr-2 h-4 w-4" />
              View All Tasks
            </Link>
          </Button>
          <Button asChild>
            <Link href="/agents/running">
              <Bot className="mr-2 h-4 w-4" />
              Manage Agents
            </Link>
          </Button>
        </div>
      </div>

      {/* Task Statistics Overview */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Task Statistics Overview
              </CardTitle>
              <CardDescription>Distribution of tasks by status</CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
              <Button
                variant={timePeriod === '7d' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimePeriod('7d')}
                className={cn(
                  'h-8 text-xs',
                  timePeriod === '7d' && 'shadow-sm'
                )}
              >
                7 Days
              </Button>
              <Button
                variant={timePeriod === '30d' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimePeriod('30d')}
                className={cn(
                  'h-8 text-xs',
                  timePeriod === '30d' && 'shadow-sm'
                )}
              >
                30 Days
              </Button>
              <Button
                variant={timePeriod === '90d' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimePeriod('90d')}
                className={cn(
                  'h-8 text-xs',
                  timePeriod === '90d' && 'shadow-sm'
                )}
              >
                90 Days
              </Button>
              <Button
                variant={timePeriod === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimePeriod('all')}
                className={cn(
                  'h-8 text-xs',
                  timePeriod === 'all' && 'shadow-sm'
                )}
              >
                All Time
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Pending */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="font-medium">Pending</span>
                </div>
                <span className="text-muted-foreground">
                  {pendingTasks.length} tasks ({totalTasks > 0 ? Math.round((pendingTasks.length / totalTasks) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${totalTasks > 0 ? (pendingTasks.length / totalTasks) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Approved */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="font-medium">Approved</span>
                </div>
                <span className="text-muted-foreground">
                  {approvedTasks.length} tasks ({approvalRate}%)
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${approvalRate}%` }}
                />
              </div>
            </div>

            {/* Rejected */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="font-medium">Rejected</span>
                </div>
                <span className="text-muted-foreground">
                  {rejectedTasks.length} tasks ({totalTasks > 0 ? Math.round((rejectedTasks.length / totalTasks) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${totalTasks > 0 ? (rejectedTasks.length / totalTasks) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Obsolete */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-400" />
                  <span className="font-medium">Obsolete</span>
                </div>
                <span className="text-muted-foreground">
                  {DUMMY_TASKS.filter((t) => t.status === 'obsolete').length} tasks (
                  {totalTasks > 0 ? Math.round((DUMMY_TASKS.filter((t) => t.status === 'obsolete').length / totalTasks) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400 transition-all"
                  style={{
                    width: `${
                      totalTasks > 0 ? (DUMMY_TASKS.filter((t) => t.status === 'obsolete').length / totalTasks) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance Metrics */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 py-4">
        {/* Agent Instances */}
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

        {/* Success Rate */}
        <div className="group">
          <div className="flex items-baseline gap-3 mb-1.5">
            <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
              {successRate}%
            </div>
            <div className="h-8 w-0.5 bg-green-500/60 dark:bg-green-400/60" />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-foreground/80">Success Rate</div>
            <div className="text-xs text-muted-foreground">Task approval rate</div>
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="group">
          <div className="flex items-baseline gap-3 mb-1.5">
            <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
              {avgResponseTime}s
            </div>
            <div className="h-8 w-0.5 bg-blue-500/60 dark:bg-blue-400/60" />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-foreground/80">Avg Response Time</div>
            <div className="text-xs text-muted-foreground">Agent speed</div>
          </div>
        </div>

        {/* Agent Utilization */}
        <div className="group">
          <div className="flex items-baseline gap-3 mb-1.5">
            <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
              {agentUtilization}%
            </div>
            <div className="h-8 w-0.5 bg-purple-500/60 dark:bg-purple-400/60" />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-foreground/80">Agent Utilization</div>
            <div className="text-xs text-muted-foreground">{tasksPerAgent} tasks/agent</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest updates from your agents</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tasks">
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {DUMMY_TASKS.slice(0, 6).map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      <Badge
                        variant={TASK_STATUS_CONFIG[task.status].variant}
                        className={`${TASK_STATUS_CONFIG[task.status].colors.badge} flex-shrink-0`}
                      >
                        {TASK_STATUS_CONFIG[task.status].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {task.createdBy.name} • {new Date(task.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Agent Instances */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Agents
            </CardTitle>
            <CardDescription>Currently active and working</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAgents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading agents...</span>
              </div>
            ) : activeAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <div className="rounded-full bg-muted/50 p-3">
                  <Bot className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">No active agents</p>
                  <p className="text-xs text-muted-foreground">
                    Activate agents to see them here
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAgents.slice(0, 5).map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                  >
                    <div className="h-10 w-10 rounded-md bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {agent.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <AgentStatusBadge status={agent.status} size="xs" />
                        {agent.uptime && (
                          <span className="text-xs text-muted-foreground">
                            {agent.uptime}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      asChild
                    >
                      <Link href={`/conversations/${agent.template}`}>
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Separator className="my-4" />
            <Button 
              size="sm" 
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm hover:shadow-md transition-all" 
              asChild
            >
              <Link href="/agents/running">
                <Users className="mr-2 h-4 w-4" />
                Manage All Agents
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Temporary Toast Demo for Styling */}
      {/* <div className="mt-8">
        <ToastDemo />
      </div> */}
    </div>
  );
}
