'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Bot, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Task } from '@/lib/data/dummy-tasks';
import { TaskListItem } from '@/components/features/tasks/task-list-item';
import { TaskDetail } from '@/components/features/tasks/task-detail';
import { Badge } from '@/components/ui/badge';
import { IconAvatar } from '@/components/ui/icon-avatar';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { showErrorToast } from '@/lib/utils/error-handler';
import { AgentStatus, AGENT_STATUS_CONFIG } from '@/lib/agent-status-config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type AgentActivation = {
  id: string;
  name: string;
  agentName: string;
  description: string | null;
  status: AgentStatus;
  variant: 'primary' | 'secondary' | 'accent';
};

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

function PendingTasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenantId } = useTenant();
  const { user } = useAuth();
  
  const selectedTaskId = searchParams.get('task');
  const agentNameParam = searchParams.get('agent-name');
  const activationNameParam = searchParams.get('activation-name');
  const topicParam = searchParams.get('topic');

  const [agents, setAgents] = useState<AgentActivation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
  
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  // Get unique agent names for filter
  const uniqueAgentNames = Array.from(new Set(agents.map(a => a.agentName))).sort();
  
  // Filter agents based on selected filters
  let filteredAgents = agents;
  
  // Apply status filter
  if (statusFilter === 'active') {
    filteredAgents = filteredAgents.filter(a => a.status === 'active');
  }
  
  // Apply agent name filter
  if (agentFilter !== 'all') {
    filteredAgents = filteredAgents.filter(a => a.agentName === agentFilter);
  }

  // Fetch agent activations
  useEffect(() => {
    const fetchActivations = async () => {
      if (!currentTenantId) {
        console.log('[PendingTasksPage] No current tenant ID');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/tenants/${currentTenantId}/agent-activations`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch activations');
        }

        const data = await response.json();
        console.log('[PendingTasksPage] Fetched activations:', data);

        const activations = Array.isArray(data) ? data : [];
        
        // Sort activations by creation date (newest first)
        activations.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        const mappedAgents: AgentActivation[] = activations.map((activation: any, index: number) => {
          const variants: Array<'primary' | 'secondary' | 'accent'> = ['primary', 'secondary', 'accent'];
          const variant = variants[index % variants.length];

          let status: AgentStatus = 'inactive';
          if (activation.isActive && activation.activatedAt) {
            status = 'active';
          } else if (activation.deactivatedAt) {
            status = 'inactive';
          }

          return {
            id: activation.id,
            name: activation.name,
            agentName: activation.agentName,
            description: activation.description || `Agent instance for ${activation.agentName}`,
            status,
            variant,
          };
        });

        setAgents(mappedAgents);

        // Auto-select agent based on URL parameters
        if (agentNameParam && activationNameParam) {
          const matchingAgent = mappedAgents.find(
            (agent) => agent.agentName === agentNameParam && agent.name === activationNameParam
          );
          if (matchingAgent) {
            setSelectedAgentId(matchingAgent.id);
            console.log('[PendingTasksPage] Auto-selected agent:', matchingAgent);
          }
        }
      } catch (error) {
        console.error('[PendingTasksPage] Error fetching activations:', error);
        showErrorToast(error, 'Failed to load agent activations');
        setAgents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivations();
  }, [currentTenantId, agentNameParam, activationNameParam]);

  // Fetch tasks when agent is selected
  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentTenantId || !selectedAgentId) {
        setTasks([]);
        return;
      }

      const selectedAgent = agents.find((a) => a.id === selectedAgentId);
      if (!selectedAgent) {
        setTasks([]);
        return;
      }

      setIsLoadingTasks(true);
      try {
        // participantId is now obtained from session on the backend for security
        const params = new URLSearchParams({
          agentName: selectedAgent.agentName,
          activationName: selectedAgent.name,
          status: 'Running',
        });

        if (topicParam) {
          params.set('topic', topicParam);
        }

        const response = await fetch(
          `/api/tenants/${currentTenantId}/tasks?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }

        const data: XiansTasksResponse = await response.json();
        console.log('[PendingTasksPage] Fetched tasks:', data);

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
              topicId: topicParam || undefined,
              content: {
                originalRequest: xiansTask.initialWork || undefined,
                proposedAction: xiansTask.finalWork || undefined,
                reasoning: xiansTask.description || undefined,
                data: {
                  workflowId: xiansTask.workflowId,
                  runId: xiansTask.runId,
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
        console.error('[PendingTasksPage] Error fetching tasks:', error);
        showErrorToast(error, 'Failed to load tasks');
        setTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchTasks();
  }, [currentTenantId, selectedAgentId, topicParam, agents]);

  const handleTaskClick = (taskId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('task', taskId);
    router.push(`/tasks/pending?${params.toString()}`, { scroll: false });
  };

  const handleCloseSlider = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('task');
    router.push(`/tasks/pending?${params.toString()}`, { scroll: false });
  };

  const handleApprove = (taskId: string) => {
    console.log('Approving task:', taskId);
    handleCloseSlider();
  };

  const handleReject = (taskId: string) => {
    console.log('Rejecting task:', taskId);
    handleCloseSlider();
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      const params = new URLSearchParams();
      params.set('agent-name', agent.agentName);
      params.set('activation-name', agent.name);
      if (topicParam) {
        params.set('topic', topicParam);
      }
      router.push(`/tasks/pending?${params.toString()}`, { scroll: false });
    }
  };

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Pending Tasks</h1>
            <p className="text-muted-foreground mt-1">
              Tasks awaiting your review and approval
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{tasks.length} pending task{tasks.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Agent List */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3">
            <Card className="h-fit sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Running Agents</CardTitle>
                <CardDescription>Select an agent to view its tasks</CardDescription>
                
                {/* Status Filter Toggle */}
                <div className="pt-3">
                  <div className="inline-flex w-full items-center rounded-md border border-dashed bg-transparent h-8">
                    <button
                      onClick={() => setStatusFilter('active')}
                      className={`flex-1 h-full text-xs font-medium transition-colors ${
                        statusFilter === 'active'
                          ? 'bg-primary text-white'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      }`}
                    >
                      Active
                    </button>
                    <div className="w-px h-4 bg-border" />
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`flex-1 h-full text-xs font-medium transition-colors ${
                        statusFilter === 'all'
                          ? 'bg-primary text-white'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>

                {/* Agent Name Filter */}
                {uniqueAgentNames.length > 0 && (
                  <div className="pt-2">
                    <Select value={agentFilter} onValueChange={setAgentFilter}>
                      <SelectTrigger className="h-8 w-full text-xs border-dashed bg-transparent hover:bg-accent/50 transition-colors">
                        <SelectValue placeholder="Filter by agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All Agents ({agents.length})</SelectItem>
                        {uniqueAgentNames.map((agentName) => {
                          const count = agents.filter(a => a.agentName === agentName).length;
                          return (
                            <SelectItem key={agentName} value={agentName} className="text-xs">
                              {agentName} ({count})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="!px-0 !py-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredAgents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6">
                    <Bot className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground text-center">
                      {agents.length === 0 ? 'No active agents found' : 'No agents match the filter'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredAgents.map((agent) => {
                      const isSelected = agent.id === selectedAgentId;
                      return (
                        <button
                          key={agent.id}
                          onClick={() => handleAgentSelect(agent.id)}
                          className={`w-full px-4 py-3 text-left transition-colors ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-accent/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <IconAvatar icon={Bot} variant={agent.variant} size="sm" rounded="md" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`text-sm font-medium break-words ${
                                  isSelected 
                                    ? 'text-primary-foreground' 
                                    : 'hover:text-foreground'
                                }`}>
                                  {agent.name}
                                </h4>
                              </div>
                              <p className={`text-xs break-words mb-2 ${
                                isSelected 
                                  ? 'text-primary-foreground/80' 
                                  : 'text-muted-foreground hover:text-foreground/80'
                              }`}>
                                {agent.agentName}
                              </p>
                              <Badge
                                variant={AGENT_STATUS_CONFIG[agent.status].variant}
                                className={`text-xs ${AGENT_STATUS_CONFIG[agent.status].colors.badge}`}
                              >
                                {AGENT_STATUS_CONFIG[agent.status].label}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Tasks List */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9">
            {!selectedAgentId ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Agent Selected
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Select an agent from the list to view its pending tasks
                  </p>
                </CardContent>
              </Card>
            ) : selectedAgent ? (
              <>
                {/* Selected Agent Info */}
                <Card className="mb-4">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <IconAvatar icon={Bot} variant={selectedAgent.variant} size="md" rounded="md" />
                      <div className="flex-1">
                        <CardTitle className="text-lg">{selectedAgent.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {selectedAgent.agentName}
                          {topicParam && (
                            <span className="ml-2">
                              • Topic: <span className="font-medium">{topicParam}</span>
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={AGENT_STATUS_CONFIG[selectedAgent.status].variant}
                        className={AGENT_STATUS_CONFIG[selectedAgent.status].colors.badge}
                      >
                        {AGENT_STATUS_CONFIG[selectedAgent.status].label}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Tasks List */}
                {isLoadingTasks ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">Loading tasks...</p>
                    </CardContent>
                  </Card>
                ) : tasks.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No pending tasks
                      </h3>
                      <p className="text-sm text-muted-foreground text-center max-w-md">
                        This agent has no tasks waiting for your approval at the moment.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="overflow-visible">
                    <CardHeader>
                      <CardTitle>Pending Tasks</CardTitle>
                      <CardDescription>
                        Click on a task to view full details and take action
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="!px-0 !py-0">
                      {tasks.map((task) => (
                        <TaskListItem
                          key={task.id}
                          task={task}
                          onClick={() => handleTaskClick(task.id)}
                          isSelected={task.id === selectedTaskId}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Task Detail Slider */}
      <Sheet open={!!selectedTask} onOpenChange={handleCloseSlider}>
        <SheetContent className="flex flex-col p-0">
          {selectedTask && (
            <>
              <SheetHeader className="px-6 pt-6">
                <SheetTitle className="text-base">Task Details</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
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

export default function PendingTasksPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6">Loading...</div>}>
      <PendingTasksContent />
    </Suspense>
  );
}
