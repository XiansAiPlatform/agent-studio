'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Task } from '@/lib/data/dummy-tasks';
import { TaskListItem } from '@/components/features/tasks/task-list-item';
import { TaskDetail } from '@/components/features/tasks/task-detail';
import { TaskFiltersComponent, TaskFilters } from '@/components/features/tasks';
import { TASK_STATUS_CONFIG } from '@/lib/task-status-config';
import { cn } from '@/lib/utils';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { showErrorToast } from '@/lib/utils/error-handler';
import { Loader2 } from 'lucide-react';

type XiansTask = {
  taskId: string;
  workflowId: string;
  runId: string;
  title: string;
  description: string;
  initialWork: string | null;
  finalWork: string | null;
  participantId: string;
  status: string;
  isCompleted: boolean;
  availableActions: string[];
  performedAction: string | null;
  comment: string | null;
  startTime: string;
  closeTime: string | null;
  metadata: any;
  agentName: string;
  activationName: string;
  tenantId: string;
};

type XiansTasksResponse = {
  tasks: XiansTask[];
  nextPageToken: string | null;
  pageSize: number;
  hasNextPage: boolean;
  totalCount: number | null;
};

function TasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenantId } = useTenant();
  const { user } = useAuth();
  
  const selectedTaskId = searchParams.get('task');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  // Current user ID from auth
  const currentUserId = user?.id || 'user-001';
  
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  // Initialize filters from URL params
  const getFiltersFromURL = (): TaskFilters => {
    const scope = searchParams.get('scope') as TaskFilters['scope'] || 'all-tasks';
    const statusesParam = searchParams.get('statuses');
    const agentsParam = searchParams.get('agents');
    
    return {
      scope: ['my-tasks', 'all-tasks'].includes(scope) ? scope : 'all-tasks',
      statuses: statusesParam ? statusesParam.split(',').filter(s => 
        ['pending', 'approved', 'rejected', 'obsolete'].includes(s)
      ) as TaskFilters['statuses'] : [],
      agents: agentsParam ? agentsParam.split(',').filter(a => a.length > 0) : [],
    };
  };

  // Filter state initialized from URL
  const [filters, setFilters] = useState<TaskFilters>(() => getFiltersFromURL());

  // Fetch all tasks from API
  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentTenantId) {
        setTasks([]);
        setIsLoadingTasks(false);
        return;
      }

      setIsLoadingTasks(true);
      try {
        // participantId is now obtained from session on the backend for security
        const response = await fetch(
          `/api/tenants/${currentTenantId}/tasks`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }

        const data: XiansTasksResponse = await response.json();
        console.log('[TasksPage] Fetched tasks:', data);

        // Remove duplicates based on taskId (keep first occurrence)
        const uniqueTasks = data.tasks.reduce((acc, task) => {
          if (!acc.find(t => t.taskId === task.taskId)) {
            acc.push(task);
          }
          return acc;
        }, [] as XiansTask[]);

        // Map Xians tasks to our Task format
        const mappedTasks: Task[] = uniqueTasks.map((xiansTask) => {
            // Map status: Running -> pending, Completed -> approved
            let status: 'pending' | 'approved' | 'rejected' | 'obsolete' = 'pending';
            if (xiansTask.isCompleted) {
              status = xiansTask.performedAction?.toLowerCase().includes('reject') ? 'rejected' : 'approved';
            }

            return {
              id: xiansTask.taskId,
              title: xiansTask.title || 'Untitled Task',
              description: xiansTask.description || 'No description available',
              status,
              priority: 'medium', // Default priority
              createdBy: {
                id: xiansTask.agentName || 'Unknown Agent',
                name: xiansTask.agentName || 'Unknown Agent',
              },
              assignedTo: {
                id: xiansTask.participantId,
                name: xiansTask.participantId,
              },
              createdAt: xiansTask.startTime,
              updatedAt: xiansTask.closeTime || xiansTask.startTime,
              conversationId: undefined,
              topicId: undefined,
              content: {
                originalRequest: xiansTask.initialWork || undefined,
                proposedAction: xiansTask.finalWork || undefined,
                reasoning: xiansTask.description || undefined,
                data: {
                  workflowId: xiansTask.workflowId,
                  runId: xiansTask.runId,
                  workflowStatus: xiansTask.status, // Add workflow status from API
                  isCompleted: xiansTask.isCompleted, // Add isCompleted flag
                  availableActions: xiansTask.availableActions || [],
                  performedAction: xiansTask.performedAction || null,
                  comment: xiansTask.comment || null,
                  metadata: xiansTask.metadata || null,
                  activationName: xiansTask.activationName,
                },
              },
            };
        });

        setTasks(mappedTasks);
      } catch (error) {
        console.error('[TasksPage] Error fetching tasks:', error);
        showErrorToast(error, 'Failed to load tasks');
        setTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchTasks();
  }, [currentTenantId]);

  // Sync filters from URL when searchParams change (for browser back/forward navigation)
  useEffect(() => {
    const urlFilters = getFiltersFromURL();
    const filtersChanged = 
      urlFilters.scope !== filters.scope ||
      JSON.stringify(urlFilters.statuses) !== JSON.stringify(filters.statuses) ||
      JSON.stringify(urlFilters.agents) !== JSON.stringify(filters.agents);
    
    if (filtersChanged) {
      setFilters(urlFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Update URL when filters change
  const updateFiltersWithURL = (newFilters: TaskFilters) => {
    setFilters(newFilters);
    
    // Build new URL with filter params
    const params = new URLSearchParams(searchParams.toString());
    
    // Update scope
    if (newFilters.scope !== 'all-tasks') {
      params.set('scope', newFilters.scope);
    } else {
      params.delete('scope');
    }
    
    // Update statuses
    if (newFilters.statuses.length > 0) {
      params.set('statuses', newFilters.statuses.join(','));
    } else {
      params.delete('statuses');
    }
    
    // Update agents
    if (newFilters.agents.length > 0) {
      params.set('agents', newFilters.agents.join(','));
    } else {
      params.delete('agents');
    }
    
    // Preserve the task parameter if present
    const taskParam = searchParams.get('task');
    if (taskParam) {
      params.set('task', taskParam);
    }
    
    // Update URL
    const newURL = params.toString() ? `/tasks?${params.toString()}` : '/tasks';
    router.push(newURL, { scroll: false });
  };

  // Extract unique agents from tasks
  const availableAgents = useMemo(() => {
    const agentNames = new Set(tasks.map((task) => task.createdBy.name));
    return Array.from(agentNames).sort();
  }, [tasks]);

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
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
  }, [tasks, filters, currentUserId]);

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
            onFiltersChange={updateFiltersWithURL}
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
              {filteredTasks.length === tasks.length
                ? 'All Tasks'
                : `Filtered Tasks (${filteredTasks.length} of ${tasks.length})`}
            </CardTitle>
            <CardDescription>Click on a task to view details</CardDescription>
          </CardHeader>
          <CardContent className="!px-0 !py-0">
            {isLoadingTasks ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading tasks...</p>
              </div>
            ) : filteredTasks.length > 0 ? (
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
                {tasks.length === 0 ? 'No tasks found' : 'No tasks match the selected filters'}
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
