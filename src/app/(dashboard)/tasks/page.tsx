'use client';

import { Suspense, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DUMMY_TASKS, getTaskById } from '@/lib/data/dummy-tasks';
import { TaskListItem } from '@/components/features/tasks/task-list-item';
import { TaskDetail } from '@/components/features/tasks/task-detail';
import { TaskFiltersComponent, TaskFilters } from '@/components/features/tasks';
import { TASK_STATUS_CONFIG } from '@/lib/task-status-config';
import { cn } from '@/lib/utils';

function TasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTaskId = searchParams.get('task');
  const selectedTask = selectedTaskId ? getTaskById(selectedTaskId) : null;

  // Current user ID (in a real app, this would come from auth context)
  const currentUserId = 'user-001';

  // Filter state
  const [filters, setFilters] = useState<TaskFilters>({
    scope: 'all-tasks',
    statuses: [],
    agents: [],
  });

  // Extract unique agents from tasks
  const availableAgents = useMemo(() => {
    const agentNames = new Set(DUMMY_TASKS.map((task) => task.createdBy.name));
    return Array.from(agentNames).sort();
  }, []);

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    return DUMMY_TASKS.filter((task) => {
      // Filter by scope (my tasks vs all tasks)
      if (filters.scope === 'my-tasks') {
        if (task.assignedTo?.id !== currentUserId) {
          return false;
        }
      }
      // Filter by status
      if (filters.statuses.length > 0 && !filters.statuses.includes(task.status as any)) {
        return false;
      }
      // Filter by agent
      if (filters.agents.length > 0 && !filters.agents.includes(task.createdBy.name)) {
        return false;
      }
      return true;
    });
  }, [filters, currentUserId]);

  const handleTaskClick = (taskId: string) => {
    router.push(`/tasks?task=${taskId}`, { scroll: false });
  };

  const handleCloseSlider = () => {
    router.push('/tasks', { scroll: false });
  };

  const handleApprove = (taskId: string) => {
    console.log('Approving task:', taskId);
    // TODO: Implement approve logic
    handleCloseSlider();
  };

  const handleReject = (taskId: string) => {
    console.log('Rejecting task:', taskId);
    // TODO: Implement reject logic
    handleCloseSlider();
  };

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const approvedTasks = filteredTasks.filter(t => t.status === 'approved').length;
  const rejectedTasks = filteredTasks.filter(t => t.status === 'rejected').length;

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="shrink-0">
            <h1 className="text-3xl font-semibold text-foreground">All Tasks</h1>
            <p className="text-muted-foreground mt-1">
              Manage tasks requiring your attention
            </p>
          </div>
          <TaskFiltersComponent
            availableAgents={availableAgents}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        {/* Task Summary Stats */}
        <div className="grid gap-8 md:grid-cols-3 py-4">
          {/* Pending Tasks */}
          <div className="group">
            <div className="flex items-baseline gap-3 mb-1.5">
              <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                {pendingTasks.length}
              </div>
              <div className={cn("h-8 w-0.5", TASK_STATUS_CONFIG.pending.colors.bar)} />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground/80">{TASK_STATUS_CONFIG.pending.label}</div>
              <div className="text-xs text-muted-foreground">This month</div>
            </div>
          </div>

          {/* Approved Tasks */}
          <div className="group">
            <div className="flex items-baseline gap-3 mb-1.5">
              <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                {approvedTasks}
              </div>
              <div className={cn("h-8 w-0.5", TASK_STATUS_CONFIG.approved.colors.bar)} />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground/80">{TASK_STATUS_CONFIG.approved.label}</div>
              <div className="text-xs text-muted-foreground">This month</div>
            </div>
          </div>

          {/* Rejected Tasks */}
          <div className="group">
            <div className="flex items-baseline gap-3 mb-1.5">
              <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                {rejectedTasks}
              </div>
              <div className={cn("h-8 w-0.5", TASK_STATUS_CONFIG.rejected.colors.bar)} />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground/80">{TASK_STATUS_CONFIG.rejected.label}</div>
              <div className="text-xs text-muted-foreground">This month</div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>
              {filteredTasks.length === DUMMY_TASKS.length
                ? 'All Tasks'
                : `Filtered Tasks (${filteredTasks.length} of ${DUMMY_TASKS.length})`}
            </CardTitle>
            <CardDescription>Click on a task to view details</CardDescription>
          </CardHeader>
          <CardContent className="!px-0 !py-0">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task.id)}
                  isSelected={task.id === selectedTaskId}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-12 px-6">
                No tasks match the selected filters
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Slider */}
      <Sheet open={!!selectedTask} onOpenChange={handleCloseSlider}>
        <SheetContent className="flex flex-col p-0">
          {selectedTask && (
            <>
              <SheetHeader className="flex-row items-start">
                <SheetTitle className="flex-1">Task Details</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <TaskDetail
                  task={selectedTask}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6">Loading...</div>}>
      <TasksContent />
    </Suspense>
  );
}
