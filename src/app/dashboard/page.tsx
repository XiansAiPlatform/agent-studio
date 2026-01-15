'use client';

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
} from 'lucide-react';
import { DUMMY_TASKS } from '@/lib/data/dummy-tasks';
import { DUMMY_CONVERSATIONS } from '@/lib/data/dummy-conversations';
import { TASK_STATUS_CONFIG } from '@/lib/task-status-config';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const pendingTasks = DUMMY_TASKS.filter((t) => t.status === 'pending');
  const approvedTasks = DUMMY_TASKS.filter((t) => t.status === 'approved');
  const rejectedTasks = DUMMY_TASKS.filter((t) => t.status === 'rejected');
  const totalTasks = DUMMY_TASKS.length;
  const activeConversations = DUMMY_CONVERSATIONS.filter((c) => c.status === 'active').length;

  // Get unique active agents
  const activeAgents = Array.from(
    new Map(
      DUMMY_CONVERSATIONS.filter((c) => c.status === 'active').map((c) => [
        c.agent.id,
        c.agent,
      ])
    ).values()
  );

  // Calculate approval rate
  const approvalRate = totalTasks > 0 
    ? Math.round((approvedTasks.length / totalTasks) * 100) 
    : 0;

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
            <Link href="/agents">
              <Bot className="mr-2 h-4 w-4" />
              Manage Agents
            </Link>
          </Button>
        </div>
      </div>

      {/* Task Summary Stats */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 py-4">
        {/* Pending Tasks */}
        <div className="group">
          <div className="flex items-baseline gap-3 mb-1.5">
            <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
              {pendingTasks.length}
            </div>
            <div className={cn('h-8 w-0.5', TASK_STATUS_CONFIG.pending.colors.bar)} />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-foreground/80">Pending Approval</div>
            <div className="text-xs text-muted-foreground">Tasks awaiting review</div>
          </div>
        </div>

        {/* Approved Tasks */}
        <div className="group">
          <div className="flex items-baseline gap-3 mb-1.5">
            <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
              {approvedTasks.length}
            </div>
            <div className={cn('h-8 w-0.5', TASK_STATUS_CONFIG.approved.colors.bar)} />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-foreground/80">Approved Tasks</div>
            <div className="text-xs text-muted-foreground">{approvalRate}% approval rate</div>
          </div>
        </div>

        {/* Rejected Tasks */}
        <div className="group">
          <div className="flex items-baseline gap-3 mb-1.5">
            <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
              {rejectedTasks.length}
            </div>
            <div className={cn('h-8 w-0.5', TASK_STATUS_CONFIG.rejected.colors.bar)} />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-foreground/80">Rejected Tasks</div>
            <div className="text-xs text-muted-foreground">
              {totalTasks > 0 ? Math.round((rejectedTasks.length / totalTasks) * 100) : 0}% rejection rate
            </div>
          </div>
        </div>

        {/* Active Conversations */}
        <div className="group">
          <div className="flex items-baseline gap-3 mb-1.5">
            <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
              {activeConversations}
            </div>
            <div className="h-8 w-0.5 bg-blue-500/60 dark:bg-blue-400/60" />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-foreground/80">Active Conversations</div>
            <div className="text-xs text-muted-foreground">Ongoing discussions</div>
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
                    <p className="text-xs text-muted-foreground">
                      {task.createdBy.name} • {new Date(task.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Agents */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Active Agents
            </CardTitle>
            <CardDescription>Currently online and working</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeAgents.slice(0, 5).map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <div className="relative">
                    <div className="h-10 w-10 rounded-md bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                        agent.status === 'online'
                          ? 'bg-green-500'
                          : agent.status === 'busy'
                          ? 'bg-yellow-500'
                          : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {agent.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {agent.status}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    asChild
                  >
                    <Link href={`/conversations?agent=${agent.id}`}>
                      <MessageSquare className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/agents">
                <Users className="mr-2 h-4 w-4" />
                Manage All Agents
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Task Statistics */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Task Statistics Overview
          </CardTitle>
          <CardDescription>Distribution of tasks by status</CardDescription>
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
    </div>
  );
}
