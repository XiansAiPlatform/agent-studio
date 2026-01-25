'use client';

import { Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/lib/data/dummy-tasks';
import { TaskListItem } from '@/components/features/tasks/task-list-item';
import { TaskDetail } from '@/components/features/tasks/task-detail';
import { TaskFilterSlider, TaskFilters, SelectedActivation } from '@/components/features/tasks';
import { TASK_STATUS_CONFIG } from '@/lib/task-status-config';
import { cn } from '@/lib/utils';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { showErrorToast } from '@/lib/utils/error-handler';
import { Loader2, Filter, X, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

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
  const [selectedActivation, setSelectedActivation] = useState<SelectedActivation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [allActivations, setAllActivations] = useState<Array<{ activationName: string; agentName: string }>>([]);
  const [isLoadingActivations, setIsLoadingActivations] = useState(true);
  const [urlParamsInitialized, setUrlParamsInitialized] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [persistentSelectedTaskId, setPersistentSelectedTaskId] = useState<string | null>(null);

  // Current user ID from auth
  const currentUserId = user?.id || 'user-001';
  
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  // Initialize filters from URL params
  useEffect(() => {
    const statusParam = searchParams.get('status') as TaskStatusFilter;
    const agentParam = searchParams.get('agent');
    const activationParam = searchParams.get('activation');
    const pageParam = searchParams.get('page');
    const taskParam = searchParams.get('task');
    
    console.log('[TasksPage] Parsing URL params:', { statusParam, agentParam, activationParam, pageParam, taskParam });
    
    if (statusParam && ['all', 'pending'].includes(statusParam)) {
      setStatusFilter(statusParam);
    }
    
    if (agentParam && activationParam) {
      const activation = { agentName: agentParam, activationName: activationParam };
      console.log('[TasksPage] Setting activation from URL:', activation);
      setSelectedActivation(activation);
    } else {
      setSelectedActivation(null);
    }
    
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    }
    
    // Set persistent selected task from URL if present
    if (taskParam) {
      setPersistentSelectedTaskId(taskParam);
    }
    
    // Mark URL params as initialized
    setUrlParamsInitialized(true);
  }, [searchParams]);

  // Fetch all activations (both active and inactive)
  useEffect(() => {
    const fetchActivations = async () => {
      if (!currentTenantId) {
        setAllActivations([]);
        setIsLoadingActivations(false);
        return;
      }

      setIsLoadingActivations(true);
      try {
        const response = await fetch(
          `/api/tenants/${currentTenantId}/activations`
        );

        if (!response.ok) {
          // Try to get the actual error message from the server
          let errorMessage = 'Failed to fetch activations';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If parsing fails, use status text
            errorMessage = `Failed to fetch activations: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('[TasksPage] Fetched activations:', data);

        // Map the response to our format
        // The API returns an array directly, not wrapped in { activations: [...] }
        const activationsArray = Array.isArray(data) ? data : (data.activations || []);
        const activationsWithAgents = activationsArray.map((activation: any) => ({
          activationName: activation.name, // The activation instance name
          agentName: activation.agentName, // The agent template name
          isActive: activation.isActive || false, // Whether the activation is currently active
        }));

        console.log('[TasksPage] Mapped activations:', activationsWithAgents);
        setAllActivations(activationsWithAgents);
      } catch (error) {
        console.error('[TasksPage] Error fetching activations:', error);
        // Fallback: extract activations from current tasks
        const activationMap = new Map<string, string>();
        tasks.forEach((task) => {
          const activationName = task.createdBy.name;
          const agentName = task.content?.data?.agentName || 'Unknown Agent';
          if (!activationMap.has(activationName)) {
            activationMap.set(activationName, agentName);
          }
        });
        const fallbackActivations = Array.from(activationMap.entries()).map(([activationName, agentName]) => ({
          activationName,
          agentName,
          isActive: false, // We don't know the status in fallback mode
        }));
        console.log('[TasksPage] Using fallback activations from tasks:', fallbackActivations);
        setAllActivations(fallbackActivations);
      } finally {
        setIsLoadingActivations(false);
      }
    };

    fetchActivations();
  }, [currentTenantId, tasks]);

  // Fetch all tasks from API
  const fetchTasks = useCallback(async () => {
    if (!currentTenantId) {
      setTasks([]);
      setIsLoadingTasks(false);
      return;
    }

    // Wait for URL params to be initialized before fetching
    if (!urlParamsInitialized) {
      console.log('[TasksPage] Waiting for URL params to initialize...');
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
      
      // Add activation filter
      if (selectedActivation) {
        params.set('activationName', selectedActivation.activationName);
        params.set('agentName', selectedActivation.agentName);
        console.log('[TasksPage] Applying activation filter:', selectedActivation);
      } else {
        console.log('[TasksPage] No activation filter applied');
      }

      const apiUrl = `/api/tenants/${currentTenantId}/tasks?${params.toString()}`;
      console.log('[TasksPage] Fetching tasks from:', apiUrl);
      
      const response = await fetch(apiUrl);

      if (!response.ok) {
        // Try to get the actual error message from the server
        let errorMessage = 'Failed to fetch tasks';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If parsing fails, use status text
          errorMessage = `Failed to fetch tasks: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data: XiansTasksResponse = await response.json();
      console.log('[TasksPage] Fetched tasks:', data);
      
      // Update pagination state
      setHasNextPage(data.hasNextPage);
      setTotalPages(data.hasNextPage ? currentPage + 1 : currentPage);

      // Remove duplicates based on workflowId (keep first occurrence)
      const uniqueTasks = data.tasks.reduce((acc, task) => {
        if (!acc.find(t => t.workflowId === task.workflowId)) {
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
  }, [currentTenantId, statusFilter, selectedActivation, currentPage, urlParamsInitialized]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Update URL when filters change
  const updateFiltersInURL = (
    newStatusFilter: TaskStatusFilter,
    newActivation: SelectedActivation | null,
    page: number = 1
  ) => {
    const params = new URLSearchParams();
    
    // Update status filter
    if (newStatusFilter !== 'all') {
      params.set('status', newStatusFilter);
    }
    
    // Update activation filter
    if (newActivation) {
      params.set('agent', newActivation.agentName);
      params.set('activation', newActivation.activationName);
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
    setSelectedActivation(newActivation);
    setCurrentPage(page);
  };

  // Tasks are already filtered by the backend, no client-side filtering needed
  const filteredTasks = tasks;

  const handleTaskClick = (taskId: string) => {
    setPersistentSelectedTaskId(taskId);
    router.push(`/tasks?task=${taskId}`, { scroll: false });
  };

  const handleCloseSlider = () => {
    router.push('/tasks', { scroll: false });
  };

  const handleCloseWithRefresh = async (taskId: string) => {
    console.log('[TasksPage] handleCloseWithRefresh called with taskId:', taskId);
    
    // Close the slider first
    handleCloseSlider();
    console.log('[TasksPage] Slider closed, waiting 100ms...');
    
    // Small delay to ensure the slider closes smoothly
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Highlight the updated task immediately (before refresh)
    console.log('[TasksPage] Setting highlighted task:', taskId);
    setHighlightedTaskId(taskId);
    
    // Refresh the task list after animation completes (6 seconds)
    // This gives the backend time to process the status change
    setTimeout(async () => {
      console.log('[TasksPage] Animation complete, refreshing tasks...');
      await fetchTasks();
      console.log('[TasksPage] Tasks refreshed, clearing highlight');
      setHighlightedTaskId(null);
    }, 6000);
  };

  const handleApprove = async (taskId: string) => {
    console.log('[TasksPage] handleApprove called with taskId:', taskId);
    await handleCloseWithRefresh(taskId);
  };

  const handleReject = async (taskId: string) => {
    console.log('[TasksPage] handleReject called with taskId:', taskId);
    await handleCloseWithRefresh(taskId);
  };

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const completedTasks = filteredTasks.filter(t => t.status === 'approved' || t.status === 'rejected');
  const approvedTasks = filteredTasks.filter(t => t.status === 'approved').length;
  const rejectedTasks = filteredTasks.filter(t => t.status === 'rejected').length;

  // Clear individual filter
  const clearFilter = (type: 'status' | 'activation') => {
    if (type === 'status') {
      updateFiltersInURL('all', selectedActivation, 1);
    } else if (type === 'activation') {
      updateFiltersInURL(statusFilter, null, 1);
    }
  };

  const clearAllFilters = () => {
    updateFiltersInURL('all', null, 1);
  };

  const hasActiveFilters = 
    statusFilter !== 'all' || 
    selectedActivation !== null;
  
  const activeFilterCount = 
    (statusFilter !== 'all' ? 1 : 0) + 
    (selectedActivation ? 1 : 0);

  const handlePageChange = (newPage: number) => {
    updateFiltersInURL(statusFilter, selectedActivation, newPage);
  };

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="shrink-0">
              <h1 className="text-3xl font-semibold text-foreground">My Tasks</h1>
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

              {selectedActivation && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => clearFilter('activation')}
                >
                  {selectedActivation.activationName}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              )}

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

        {/* Tasks List */}
        <Card className="overflow-visible">
          <CardHeader>
            {!isLoadingTasks && filteredTasks.length > 0 && (
              <CardDescription>Click on a task to view details</CardDescription>
            )}
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
                    isSelected={task.id === persistentSelectedTaskId}
                    isHighlighted={task.id === highlightedTaskId}
                  />
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 space-y-3">
                <div className="rounded-full bg-muted/50 p-3">
                  <ClipboardList className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tasks.length === 0 
                      ? 'Tasks will appear here when they require your attention' 
                      : 'Try adjusting your filters to see more tasks'}
                  </p>
                </div>
              </div>
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
      {isFilterSliderOpen && (
        <TaskFilterSlider
          isOpen={isFilterSliderOpen}
          onClose={() => setIsFilterSliderOpen(false)}
          activations={allActivations}
          statusFilter={statusFilter}
          selectedActivation={selectedActivation}
          onFiltersChange={(newStatus, newActivation) => {
            console.log('[TasksPage] Filter changed:', { newStatus, newActivation });
            updateFiltersInURL(newStatus, newActivation, 1);
          }}
        />
      )}

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
