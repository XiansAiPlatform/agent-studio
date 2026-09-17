'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Task } from '@/types/task';
import { TaskListItem } from '@/components/features/tasks/task-list-item';
import { TaskDetail } from '@/components/features/tasks/task-detail';
import { TaskFilterSlider, SelectedActivation } from '@/components/features/tasks';
import { fetchTaskByIdClient, mapXiansTaskToTask, taskMatchesId } from '@/lib/task-mapper';
import { cn } from '@/lib/utils';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { showErrorToast } from '@/lib/utils/error-handler';
import { Filter, X, ChevronLeft, ChevronRight, ClipboardList, CheckSquare } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { useParticipantLayout } from '@/contexts/participant-layout-context';
import { ParticipantMenuBar } from '@/app/(dashboard)/conversations/[agentName]/[activationName]/_components/participant-menu-bar';

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
type ViewType = 'my' | 'everyone';

function TasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenantId } = useTenant();
  const { user } = useAuth();
  const { isParticipantMode, onOpenMenu } = useParticipantLayout();
  
  const selectedTaskId = searchParams.get('task');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isFilterSliderOpen, setIsFilterSliderOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [selectedActivation, setSelectedActivation] = useState<SelectedActivation | null>(null);
  const [viewType, setViewType] = useState<ViewType>('my');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [allActivations, setAllActivations] = useState<Array<{ activationName: string; agentName: string }>>([]);
  const [isLoadingActivations, setIsLoadingActivations] = useState(true);
  const [urlParamsInitialized, setUrlParamsInitialized] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [persistentSelectedTaskId, setPersistentSelectedTaskId] = useState<string | null>(null);
  const [deepLinkedTask, setDeepLinkedTask] = useState<Task | null>(null);
  const [isLoadingDeepLinkedTask, setIsLoadingDeepLinkedTask] = useState(false);

  const currentUserEmail = user?.email || null;
  const selectedTaskFromList = selectedTaskId
    ? tasks.find((task) => taskMatchesId(task, selectedTaskId)) ?? null
    : null;
  const selectedTask = selectedTaskFromList || deepLinkedTask;

  // Initialize filters from URL params
  useEffect(() => {
    const statusParam = searchParams.get('status') as TaskStatusFilter;
    const agentParam = searchParams.get('agent');
    const activationParam = searchParams.get('activation');
    const pageParam = searchParams.get('page');
    const taskParam = searchParams.get('task');
    const viewTypeParam = searchParams.get('viewType') as ViewType;
    
    console.log('[TasksPage] Parsing URL params:', { statusParam, agentParam, activationParam, pageParam, taskParam, viewTypeParam });
    
    if (statusParam && ['all', 'pending'].includes(statusParam)) {
      setStatusFilter(statusParam);
    } else {
      setStatusFilter('all');
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
      } else {
        setCurrentPage(1);
      }
    } else {
      setCurrentPage(1);
    }
    
    if (!isParticipantMode && viewTypeParam && ['my', 'everyone'].includes(viewTypeParam)) {
      setViewType(viewTypeParam);
    } else {
      setViewType('my');
    }
    
    // Set persistent selected task from URL if present
    if (taskParam) {
      setPersistentSelectedTaskId(taskParam);
    }
    
    // Mark URL params as initialized
    setUrlParamsInitialized(true);
  }, [searchParams, isParticipantMode]);

  // Fetch all activations (both active and inactive)
  const activationsAbortControllerRef = useRef<AbortController | null>(null);
  const activationsRequestIdRef = useRef(0);
  const tasksRequestIdRef = useRef(0);
  
  useEffect(() => {
    const fetchActivations = async () => {
      if (!currentTenantId) {
        setAllActivations([]);
        setIsLoadingActivations(false);
        return;
      }

      // Cancel any pending request
      if (activationsAbortControllerRef.current) {
        activationsAbortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      activationsAbortControllerRef.current = new AbortController();

      const requestId = ++activationsRequestIdRef.current;
      setIsLoadingActivations(true);
      try {
        const response = await fetch(
          `/api/agent-activations`,
          {
            signal: activationsAbortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          let errorMessage = 'Failed to fetch activations';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            errorMessage = `Failed to fetch activations: ${response.status} ${response.statusText}`;
          }
          console.warn('[TasksPage] Activations request failed:', errorMessage);
          setAllActivations([]);
          return;
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
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[TasksPage] Activations request aborted');
          return;
        }
        
        console.warn('[TasksPage] Error fetching activations:', error);
        // Fallback: use empty array instead of extracting from tasks
        // to avoid creating a dependency cycle
        setAllActivations([]);
      } finally {
        if (requestId === activationsRequestIdRef.current) {
          setIsLoadingActivations(false);
        }
      }
    };

    fetchActivations();

    // Cleanup function to abort request if component unmounts or tenantId changes
    return () => {
      if (activationsAbortControllerRef.current) {
        activationsAbortControllerRef.current.abort();
      }
    };
  }, [currentTenantId]); // Removed 'tasks' from dependencies to prevent infinite loop

  // Fetch all tasks from API
  const tasksAbortControllerRef = useRef<AbortController | null>(null);
  
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

    // Cancel any pending request
    if (tasksAbortControllerRef.current) {
      tasksAbortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    tasksAbortControllerRef.current = new AbortController();

    const requestId = ++tasksRequestIdRef.current;
    setIsLoadingTasks(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.set('pageSize', '20');
      params.set('pageToken', currentPage.toString());
      params.set('viewType', isParticipantMode ? 'my' : viewType);
      
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

      const apiUrl = `/api/tasks?${params.toString()}`;
      console.log('[TasksPage] Fetching tasks from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        signal: tasksAbortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch tasks';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `Failed to fetch tasks: ${response.status} ${response.statusText}`;
        }
        showErrorToast(errorMessage, 'Failed to load tasks');
        setTasks([]);
        return;
      }

      const data: XiansTasksResponse = await response.json();
      console.log('[TasksPage] Fetched tasks:', data);
      
      // Update pagination state
      setHasNextPage(data.hasNextPage);
      setTotalPages(data.hasNextPage ? currentPage + 1 : currentPage);

      // Remove duplicates based on workflowId (keep first occurrence)
      const listedTasks = Array.isArray(data.tasks) ? data.tasks : [];
      const uniqueTasks = listedTasks.reduce((acc, task) => {
        if (!acc.find(t => t.workflowId === task.workflowId)) {
          acc.push(task);
        }
        return acc;
      }, [] as XiansTask[]);

      const mappedTasks: Task[] = uniqueTasks.map((xiansTask) => mapXiansTaskToTask(xiansTask));

      setTasks(mappedTasks);
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[TasksPage] Tasks request aborted');
        return;
      }
      
      console.warn('[TasksPage] Error fetching tasks:', error);
      showErrorToast(error, 'Failed to load tasks');
      setTasks([]);
    } finally {
      if (requestId === tasksRequestIdRef.current) {
        setIsLoadingTasks(false);
      }
    }
  }, [currentTenantId, statusFilter, selectedActivation, viewType, currentPage, urlParamsInitialized, isParticipantMode]);

  useEffect(() => {
    fetchTasks();

    // Cleanup function to abort request if component unmounts or dependencies change
    return () => {
      if (tasksAbortControllerRef.current) {
        tasksAbortControllerRef.current.abort();
      }
    };
  }, [fetchTasks]);

  useEffect(() => {
    if (!selectedTaskId) {
      setDeepLinkedTask(null);
      setIsLoadingDeepLinkedTask(false);
      return;
    }

    if (tasks.some((task) => taskMatchesId(task, selectedTaskId))) {
      setDeepLinkedTask(null);
      setIsLoadingDeepLinkedTask(false);
      return;
    }

    const abortController = new AbortController();
    setIsLoadingDeepLinkedTask(true);

    fetchTaskByIdClient(selectedTaskId)
      .then((task) => {
        if (abortController.signal.aborted) return;
        setDeepLinkedTask(task);
        if (!task) {
          showErrorToast(
            'This request could not be opened. It may have been completed or you may not have access to it.',
            'Unable to open request'
          );
        }
      })
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (!abortController.signal.aborted) {
          setDeepLinkedTask(null);
          showErrorToast(error, 'Unable to open request');
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) setIsLoadingDeepLinkedTask(false);
      });

    return () => abortController.abort();
  }, [selectedTaskId, tasks]);

  const buildTasksHref = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (isParticipantMode) {
        params.delete('viewType');
      }
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      return qs ? `/tasks?${qs}` : '/tasks';
    },
    [searchParams, isParticipantMode]
  );

  // Update URL when filters change
  const updateFiltersInURL = (
    newStatusFilter: TaskStatusFilter,
    newActivation: SelectedActivation | null,
    newViewType?: ViewType,
    page: number = 1
  ) => {
    const finalViewType = isParticipantMode
      ? 'my'
      : newViewType !== undefined
        ? newViewType
        : viewType;

    const href = buildTasksHref({
      viewType: finalViewType === 'my' ? null : finalViewType,
      status: newStatusFilter !== 'all' ? newStatusFilter : null,
      agent: newActivation?.agentName ?? null,
      activation: newActivation?.activationName ?? null,
      page: page > 1 ? page.toString() : null,
    });
    router.push(href, { scroll: false });
    
    setStatusFilter(newStatusFilter);
    setSelectedActivation(newActivation);
    if (!isParticipantMode && newViewType !== undefined) {
      setViewType(newViewType);
    }
    setCurrentPage(page);
  };

  // Tasks are already filtered by the backend, no client-side filtering needed
  const filteredTasks = tasks;

  const handleTaskClick = (taskId: string) => {
    setPersistentSelectedTaskId(taskId);
    router.push(buildTasksHref({ task: taskId }), { scroll: false });
  };

  const handleCloseSlider = () => {
    router.push(buildTasksHref({ task: null }), { scroll: false });
    setDeepLinkedTask(null);
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

  // Clear individual filter
  const clearFilter = (type: 'status' | 'activation') => {
    if (type === 'status') {
      updateFiltersInURL('all', selectedActivation, undefined, 1);
    } else if (type === 'activation') {
      updateFiltersInURL(statusFilter, null, undefined, 1);
    }
  };

  const clearAllFilters = () => {
    updateFiltersInURL('all', null, undefined, 1);
  };

  const hasActiveFilters = 
    statusFilter !== 'all' || 
    selectedActivation !== null;
  
  const activeFilterCount = 
    (statusFilter !== 'all' ? 1 : 0) + 
    (selectedActivation ? 1 : 0);

  const handlePageChange = (newPage: number) => {
    updateFiltersInURL(statusFilter, selectedActivation, undefined, newPage);
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
      {isParticipantMode && (
        <ParticipantMenuBar
          onOpenMenu={onOpenMenu}
          label={
            selectedActivation
              ? `Requests · ${selectedActivation.activationName}`
              : 'My Tasks'
          }
        />
      )}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                {viewType === 'my'
                  ? 'My Tasks'
                  : "Everyone's requests"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {isParticipantMode
                  ? selectedActivation
                    ? `Requests from ${selectedActivation.activationName} that need your attention`
                    : 'Manage tasks requiring your attention'
                  : viewType === 'my'
                    ? 'Manage tasks requiring your attention'
                    : 'View all tasks across the organization'}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap md:shrink-0">
              {/* Reviewers can switch between own and tenant-wide tasks. Participants stay on My Tasks. */}
              {!isParticipantMode && (
              <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3.5 py-2 border border-border/50">
                <Label 
                  htmlFor="view-type-switch" 
                  className={cn(
                    "text-xs font-medium cursor-pointer transition-colors",
                    viewType === 'my' ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  My requests
                </Label>
                <Switch
                  id="view-type-switch"
                  checked={viewType === 'everyone'}
                  onCheckedChange={(checked) => {
                    updateFiltersInURL(statusFilter, selectedActivation, checked ? 'everyone' : 'my', 1);
                  }}
                />
                <Label 
                  htmlFor="view-type-switch" 
                  className={cn(
                    "text-xs font-medium cursor-pointer transition-colors",
                    viewType === 'everyone' ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  Everyone
                </Label>
              </div>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => setIsFilterSliderOpen(true)}
                className="shrink-0 rounded-xl"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5 text-xs rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-xs text-muted-foreground font-medium">Active filters:</span>

              {statusFilter !== 'all' && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors rounded-lg pl-2.5 pr-1.5 py-1"
                  onClick={() => clearFilter('status')}
                >
                  {statusFilter === 'pending' ? 'Pending' : statusFilter}
                  <X className="ml-1.5 h-3 w-3" />
                </Badge>
              )}

              {selectedActivation && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors rounded-lg pl-2.5 pr-1.5 py-1"
                  onClick={() => clearFilter('activation')}
                >
                  {selectedActivation.activationName}
                  <X className="ml-1.5 h-3 w-3" />
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 px-2 text-xs hover:bg-muted/60"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {isLoadingTasks ? (
            <Card className="border-border">
              <CardContent className="!px-0 !py-0">
                <PageLoader label="Loading tasks..." className="py-16" />
              </CardContent>
            </Card>
          ) : filteredTasks.length > 0 ? (
            <>
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task.id)}
                    isSelected={task.id === persistentSelectedTaskId}
                    isHighlighted={task.id === highlightedTaskId}
                    currentUserEmail={currentUserEmail}
                  />
                ))}
              </div>
              
              {/* Pagination */}
              <Card className="border-border">
                <CardContent className="!px-5 !py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-medium">
                      Page {currentPage}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isLoadingTasks}
                        className="h-8 rounded-lg"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!hasNextPage || isLoadingTasks}
                        className="h-8 rounded-lg"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-border">
              <CardContent className="!px-0 !py-0">
                <div className="flex flex-col items-center justify-center py-20 px-6 space-y-3">
                  <div className="rounded-full bg-muted/50 p-4">
                    <ClipboardList className="h-7 w-7 text-muted-foreground/60" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {tasks.length === 0 ? 'Nothing waiting right now' : 'No matching requests'}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {tasks.length === 0
                        ? selectedActivation
                          ? 'When this agent needs your approval, the request will show up here.'
                          : 'When an agent needs your approval, the request will show up here.'
                        : 'Try adjusting your filters to see more requests'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
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
            updateFiltersInURL(newStatus, newActivation, undefined, 1);
          }}
        />
      )}

      {/* Task Detail Slider */}
      <Sheet 
        open={!!selectedTask || isLoadingDeepLinkedTask} 
        onOpenChange={(open) => {
          if (!open) handleCloseSlider();
        }}
        headerIcon={<CheckSquare className="h-5 w-5 text-amber-500" />}
        headerTitle="Task Details"
        headerDescription={selectedTask ? selectedTask.title : 'The agent is waiting for your decision'}
      >
        <SheetContent className="flex flex-col p-0">
          {isLoadingDeepLinkedTask && !selectedTask ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16">
              <PageLoader label="Opening this request..." />
            </div>
          ) : selectedTask ? (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <TaskDetail
                task={selectedTask}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function TasksPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <Suspense fallback={<PageLoader label="Loading tasks..." className="h-full" />}>
        <TasksContent />
      </Suspense>
    </div>
  );
}
