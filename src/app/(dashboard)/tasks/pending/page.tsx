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
  
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  // Filter to show only active agents
  let filteredAgents = agents.filter(a => a.status === 'active');
  
  // Get unique agent names for filter (from active agents only)
  const uniqueAgentNames = Array.from(new Set(filteredAgents.map(a => a.agentName))).sort();
  
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

        // Auto-select agent based on URL parameters or first active agent
        if (agentNameParam && activationNameParam) {
          const matchingAgent = mappedAgents.find(
            (agent) => agent.agentName === agentNameParam && agent.name === activationNameParam
          );
          if (matchingAgent) {
            setSelectedAgentId(matchingAgent.id);
            console.log('[PendingTasksPage] Auto-selected agent from URL:', matchingAgent);
          }
        } else {
          // Auto-select first active agent if no URL parameters
          const activeAgents = mappedAgents.filter(agent => agent.status === 'active');
          if (activeAgents.length > 0) {
            const firstActiveAgent = activeAgents[0];
            setSelectedAgentId(firstActiveAgent.id);
            console.log('[PendingTasksPage] Auto-selected first active agent:', firstActiveAgent);
            
            // Update URL with the selected agent
            const params = new URLSearchParams();
            params.set('agent-name', firstActiveAgent.agentName);
            params.set('activation-name', firstActiveAgent.name);
            if (topicParam) {
              params.set('topic', topicParam);
            }
            router.push(`/tasks/pending?${params.toString()}`, { scroll: false });
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
      <div className="min-h-screen bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Modern Header */}
          <div className="mb-8">
            <div className="flex items-end justify-between mb-2">
              <h1 className="text-2xl font-medium text-foreground tracking-tight">Pending Tasks</h1>
              {tasks.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{tasks.length} pending</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground/80">
              Review and approve tasks from your active agents
            </p>
          </div>

          {/* Fluid Two Column Layout */}
          <div className="flex gap-6 items-start">
            {/* Left Panel - Agent List */}
            <div className="w-80 shrink-0">
              <div className="sticky top-6 space-y-4">
                {/* Filter */}
                {uniqueAgentNames.length > 0 && (
                  <div>
                    <Select value={agentFilter} onValueChange={setAgentFilter}>
                      <SelectTrigger className="h-9 w-full text-xs border-border/40 bg-background shadow-sm hover:bg-accent/30 transition-all">
                        <SelectValue placeholder="Filter active agents" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">
                          All Active Agents ({filteredAgents.length})
                        </SelectItem>
                        {uniqueAgentNames.map((agentName) => {
                          const count = filteredAgents.filter(a => a.agentName === agentName).length;
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

                {/* Agents */}
                <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredAgents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6">
                      <Bot className="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <p className="text-xs text-muted-foreground/80 text-center">
                        {agentFilter !== 'all' ? 'No matching agents' : 'No active agents'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {filteredAgents.map((agent) => {
                        const isSelected = agent.id === selectedAgentId;
                        return (
                          <button
                            key={agent.id}
                            onClick={() => handleAgentSelect(agent.id)}
                            className={`w-full px-4 py-3.5 text-left transition-all duration-200 ${
                              isSelected 
                                ? 'bg-primary/10 border-l-2 border-primary' 
                                : 'hover:bg-muted/50 border-l-2 border-transparent'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                <IconAvatar 
                                  icon={Bot} 
                                  variant={agent.variant} 
                                  size="sm" 
                                  rounded="full"
                                />
                              </div>
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <h4 className="text-sm font-medium text-foreground leading-tight truncate">
                                  {agent.name}
                                </h4>
                                <p className="text-xs text-muted-foreground/70 leading-tight truncate">
                                  {agent.agentName}
                                </p>
                                <Badge
                                  variant={AGENT_STATUS_CONFIG[agent.status].variant}
                                  className={`text-[10px] px-2 py-0 h-5 ${AGENT_STATUS_CONFIG[agent.status].colors.badge}`}
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
                </div>
              </div>
            </div>

            {/* Right Panel - Tasks */}
            <div className="flex-1 min-w-0">
              {!selectedAgentId ? (
                <div className="rounded-xl border border-border/40 bg-card shadow-sm p-12">
                  <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Bot className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-base font-medium text-foreground mb-2">
                      Select an agent
                    </h3>
                    <p className="text-sm text-muted-foreground/70">
                      Choose an agent from the list to view pending tasks
                    </p>
                  </div>
                </div>
              ) : selectedAgent ? (
                <div className="space-y-4">
                  {/* Agent Header */}
                  <div className="rounded-xl border border-border/40 bg-card shadow-sm p-4">
                    <div className="flex items-center gap-3">
                      <IconAvatar 
                        icon={Bot} 
                        variant={selectedAgent.variant} 
                        size="md" 
                        rounded="full"
                        pulse={selectedAgent.status === 'active'}
                      />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-medium text-foreground truncate">
                          {selectedAgent.name}
                        </h2>
                        <p className="text-xs text-muted-foreground/70 truncate">
                          {selectedAgent.agentName}
                          {topicParam && (
                            <span className="ml-2">
                              • {topicParam}
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge
                        variant={AGENT_STATUS_CONFIG[selectedAgent.status].variant}
                        className={`${AGENT_STATUS_CONFIG[selectedAgent.status].colors.badge}`}
                      >
                        {AGENT_STATUS_CONFIG[selectedAgent.status].label}
                      </Badge>
                    </div>
                  </div>

                  {/* Tasks */}
                  {isLoadingTasks ? (
                    <div className="rounded-xl border border-border/40 bg-card shadow-sm p-12">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground/70">Loading tasks...</p>
                      </div>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="rounded-xl border border-border/40 bg-card shadow-sm p-12">
                      <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                          <Clock className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-base font-medium text-foreground mb-2">
                          All clear
                        </h3>
                        <p className="text-sm text-muted-foreground/70">
                          No pending tasks for this agent
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
                      {tasks.map((task) => (
                        <TaskListItem
                          key={task.id}
                          task={task}
                          onClick={() => handleTaskClick(task.id)}
                          isSelected={task.id === selectedTaskId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Slider */}
      <Sheet open={!!selectedTask} onOpenChange={handleCloseSlider}>
        <SheetContent className="flex flex-col p-0 w-[600px] max-w-[90vw]">
          {selectedTask && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
                <SheetTitle className="text-base font-medium">Task Details</SheetTitle>
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
