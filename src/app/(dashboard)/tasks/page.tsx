'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/lib/data/dummy-tasks';
import { TaskListItem } from '@/components/features/tasks/task-list-item';
import { TaskDetail } from '@/components/features/tasks/task-detail';
import { TaskFilterSlider, TaskFilters } from '@/components/features/tasks';
import { TASK_STATUS_CONFIG } from '@/lib/task-status-config';
import { cn } from '@/lib/utils';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { showErrorToast } from '@/lib/utils/error-handler';
import { Loader2, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

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

type TaskStatusFilter = 'all' | 'pending';

function TasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenantId } = useTenant();
  const { user } = useAuth();
  
  const selectedTaskId = searchParams.get('task');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isFilterSliderOpen, setIsFilterSliderOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [selectedActivations, setSelectedActivations] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Current user ID from auth
  const currentUserId = user?.id || 'user-001';
  
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  // Initialize filters from URL params
  useEffect(() => {
    const statusParam = searchParams.get('status') as TaskStatusFilter;
    const activationsParam = searchParams.get('activations');
    const pageParam = searchParams.get('page');
    
    if (statusParam && ['all', 'pending'].includes(statusParam)) {
      setStatusFilter(statusParam);
    }
    
    if (activationsParam) {
      setSelectedActivations(activationsParam.split(',').filter(a => a.length > 0));
    }
    
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    }
  }, [searchParams]);

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
        // Build query parameters
        const params = new URLSearchParams();
        params.set('pageSize', '20');
        params.set('pageToken', currentPage.toString());
        
        // Map frontend status filter to backend status
        if (statusFilter === 'pending') {
          params.set('status', 'Running');
        }
        
        // Add activation filters
        if (selectedActivations.length > 0) {
          // Since we can only pass one activationName at a time in the API,
          // we'll need to make multiple requests or pass comma-separated
          // For now, let's fetch all and filter client-side if multiple selections
          if (selectedActivations.length === 1) {
            params.set('activationName', selectedActivations[0]);
          }
        }

        const response = await fetch(
          `/api/tenants/${currentTenantId}/tasks?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }

        const data: XiansTasksResponse = await response.json();
        console.log('[TasksPage] Fetched tasks:', data);
        
        // Update pagination state
        setHasNextPage(data.hasNextPage);
        setTotalPages(data.hasNextPage ? currentPage + 1 : currentPage);

        // Remove duplicates based on workflowId (keep first occurrence)
        let uniqueTasks = data.tasks.reduce((acc, task) => {
          if (!acc.find(t => t.workflowId === task.workflowId)) {
            acc.push(task);
          }
          return acc;
        }, [] as XiansTask[]);
        
        // Client-side filtering if multiple activations selected
        if (selectedActivations.length > 1) {
          uniqueTasks = uniqueTasks.filter(task => 
            selectedActivations.includes(task.activationName)
          );
        }

        // Map Xians tasks to our Task format
        const mappedTasks: Task[] = uniqueTasks.map((xiansTask) => {
            // Map status: Running -> pending, Completed -> approved
            let status: 'pending' | 'approved' | 'rejected' | 'obsolete' = 'pending';
            if (xiansTask.isCompleted) {
              status = xiansTask.performedAction?.toLowerCase().includes('reject') ? 'rejected' : 'approved';
            }

            return {
              id: xiansTask.workflowId,
              title: xiansTask.title || 'Untitled Task',
              description: xiansTask.description || 'No description available',
              status,
              priority: 'medium', // Default priority
              createdBy: {
                id: xiansTask.activationName || 'Unknown Activation',
                name: xiansTask.activationName || 'Unknown Activation',
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
                  agentName: xiansTask.agentName,
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
  }, [currentTenantId, statusFilter, selectedActivations, currentPage]);

  // Update URL when filters change
  const updateFiltersInURL = (
    newStatusFilter: TaskStatusFilter,
    newActivations: string[],
    page: number = 1
  ) => {
    const params = new URLSearchParams();
    
    // Update status filter
    if (newStatusFilter !== 'all') {
      params.set('status', newStatusFilter);
    }
    
    // Update activations
    if (newActivations.length > 0) {
      params.set('activations', newActivations.join(','));
    }
    
    // Update page
    if (page > 1) {
      params.set('page', page.toString());
    }
    
    // Preserve the task parameter if present
    const taskParam = searchParams.get('task');
    if (taskParam) {
      params.set('task', taskParam);
    }
    
    // Update URL
    const newURL = params.toString() ? `/tasks?${params.toString()}` : '/tasks';
    router.push(newURL, { scroll: false });
    
    // Update state
    setStatusFilter(newStatusFilter);
    setSelectedActivations(newActivations);
    setCurrentPage(page);
  };

  // Extract unique activations with their agent names
  const activationsWithAgents = useMemo(() => {
    const activationMap = new Map<string, string>();
    
    tasks.forEach((task) => {
      const activationName = task.createdBy.name;
      const agentName = task.content?.data?.agentName || 'Unknown Agent';
      
      if (!activationMap.has(activationName)) {
        activationMap.set(activationName, agentName);
      }
    });

    return Array.from(activationMap.entries()).map(([activationName, agentName]) => ({
      activationName,
      agentName,
    }));
  }, [tasks]);

  // Tasks are already filtered by the backend, no client-side filtering needed
  const filteredTasks = tasks;

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
  const completedTasks = filteredTasks.filter(t => t.status === 'approved' || t.status === 'rejected');
  const approvedTasks = filteredTasks.filter(t => t.status === 'approved').length;
  const rejectedTasks = filteredTasks.filter(t => t.status === 'rejected').length;

  // Clear individual filter
  const clearFilter = (type: 'status' | 'activation', value?: string) => {
    if (type === 'status') {
      updateFiltersInURL('all', selectedActivations, 1);
    } else if (type === 'activation' && value) {
      const newActivations = selectedActivations.filter(a => a !== value);
      updateFiltersInURL(statusFilter, newActivations, 1);
    }
  };

  const clearAllFilters = () => {
    updateFiltersInURL('all', [], 1);
  };

  const hasActiveFilters = 
    statusFilter !== 'all' || 
    selectedActivations.length > 0;
  
  const activeFilterCount = 
    (statusFilter !== 'all' ? 1 : 0) + 
    selectedActivations.length;

  const handlePageChange = (newPage: number) => {
    updateFiltersInURL(statusFilter, selectedActivations, newPage);
  };

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="shrink-0">
              <h1 className="text-3xl font-semibold text-foreground">All Tasks</h1>
              <p className="text-muted-foreground mt-1">
                Manage tasks requiring your attention
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsFilterSliderOpen(true)}
              className="shrink-0"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter Tasks
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>

              {statusFilter !== 'all' && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => clearFilter('status')}
                >
                  {statusFilter === 'pending' ? 'Pending' : statusFilter}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              )}

              {selectedActivations.map((agent: string) => (
                <Badge
                  key={agent}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => clearFilter('activation', agent)}
                >
                  {agent}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 px-2 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
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
              <>
                {filteredTasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task.id)}
                    isSelected={task.id === selectedTaskId}
                  />
                ))}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-12 px-6">
                {tasks.length === 0 ? 'No tasks found' : 'No tasks match the selected filters'}
              </p>
            )}
          </CardContent>
          
          {/* Pagination */}
          {filteredTasks.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoadingTasks}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNextPage || isLoadingTasks}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Filter Slider */}
      <TaskFilterSlider
        isOpen={isFilterSliderOpen}
        onClose={() => setIsFilterSliderOpen(false)}
        activations={activationsWithAgents}
        statusFilter={statusFilter}
        selectedActivations={selectedActivations}
        onFiltersChange={(newStatus, newActivations) => {
          updateFiltersInURL(newStatus, newActivations, 1);
        }}
      />

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
