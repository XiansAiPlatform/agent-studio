'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { IconAvatar } from '@/components/ui/icon-avatar';
import {
  Bot,
  Play,
  MessageSquare,
  ListTodo,
  Settings,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Loader2,
  Power,
  Trash2,
  Info,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AgentStatus, AGENT_STATUS_CONFIG } from '@/lib/agent-status-config';
import { useTenant } from '@/hooks/use-tenant';
import { showErrorToast, showSuccessToast, showInfoToast } from '@/lib/utils/error-handler';
import { ActivationConfigWizard, ActivationWizardData } from '@/components/features/agents/activation-config-wizard';

type Agent = {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  template: string;
  uptime?: string;
  lastActive?: string;
  tasksCompleted: number;
  variant: 'primary' | 'secondary' | 'accent';
};

type SliderType = 'actions' | 'configure' | 'activity' | 'performance' | null;

export default function AgentsPage() {
  const { currentTenantId } = useTenant();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [sliderType, setSliderType] = useState<SliderType>(null);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [agentToDeactivate, setAgentToDeactivate] = useState<Agent | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  
  // Activation wizard state
  const [showActivationWizard, setShowActivationWizard] = useState(false);
  const [wizardData, setWizardData] = useState<ActivationWizardData | null>(null);
  const [isLoadingWizard, setIsLoadingWizard] = useState(false);
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, Record<string, string>>>({});
  const [isActivating, setIsActivating] = useState(false);
  const [currentActivationId, setCurrentActivationId] = useState<string | null>(null);

  // Check for newly created instance from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const newInstanceId = params.get('newInstance');
      if (newInstanceId) {
        setNewlyCreatedId(newInstanceId);
        
        // Remove the highlight after 10 seconds
        const timer = setTimeout(() => {
          setNewlyCreatedId(null);
        }, 10000);
        
        // Clean URL without reloading
        window.history.replaceState({}, '', window.location.pathname);
        
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Fetch activations from API
  useEffect(() => {
    const fetchActivations = async () => {
      if (!currentTenantId) {
        console.log('[AgentsPage] No current tenant ID');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/tenants/${currentTenantId}/agent-activations`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch activations');
        }

        const data = await response.json();
        console.log('[AgentsPage] Fetched activations:', data);

        // Map activations to Agent format
        const activations = Array.isArray(data) ? data : [];
        
        // Sort activations by creation date (newest first)
        activations.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        
        const mappedAgents: Agent[] = activations.map((activation: any, index: number) => {
          // Determine variant based on index for visual variety
          const variants: Array<'primary' | 'secondary' | 'accent'> = ['primary', 'secondary', 'accent'];
          const variant = variants[index % variants.length];

          // Map isActive and activatedAt to AgentStatus
          let status: AgentStatus = 'inactive';
          if (activation.isActive && activation.activatedAt) {
            status = 'active';
          } else if (activation.deactivatedAt) {
            status = 'inactive';
          } else {
            // For agents that are not active and haven't been deactivated
            status = 'inactive';
          }

          // Calculate time-related fields
          const referenceDate = activation.activatedAt || activation.createdAt;
          const createdAt = new Date(referenceDate);
          const now = new Date();
          const diffMs = now.getTime() - createdAt.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

          return {
            id: activation.id,
            name: activation.name,
            description: activation.description || `Agent instance for ${activation.agentName}`,
            status,
            template: activation.agentName,
            uptime: status === 'active' ? `${diffHours}h ${diffMinutes}m` : undefined,
            lastActive: status !== 'active' ? (diffHours > 0 ? `${diffHours}h ago` : `${diffMinutes}m ago`) : undefined,
            tasksCompleted: 0, // This would need to come from a different endpoint
            variant,
          };
        });

        setAgents(mappedAgents);
      } catch (error) {
        console.error('[AgentsPage] Error fetching activations:', error);
        showErrorToast(error, 'Failed to load agent activations');
        setAgents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivations();
  }, [currentTenantId]);

  const openSlider = (agent: Agent, type: SliderType = 'actions') => {
    setSelectedAgent(agent);
    setSliderType(type);
  };

  const closeSlider = () => {
    setSliderType(null);
    setSelectedAgent(null);
  };

  const handleCardClick = (agent: Agent) => {
    openSlider(agent, 'actions');
  };

  const handleDeleteClick = (agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteDialog(true);
  };

  const handleDeactivateClick = (agent: Agent) => {
    setAgentToDeactivate(agent);
    setShowDeactivateDialog(true);
  };

  const handleDeactivate = async () => {
    if (!currentTenantId || !agentToDeactivate) {
      return;
    }

    setIsDeactivating(true);

    try {
      const response = await fetch(
        `/api/tenants/${currentTenantId}/agent-activations/${agentToDeactivate.id}/deactivate`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to deactivate agent');
      }

      showSuccessToast(
        `Agent Deactivated`,
        `${agentToDeactivate.name} has been deactivated and stopped running`,
        {
          icon: '⏸️'
        }
      );
      
      setShowDeactivateDialog(false);
      closeSlider();
      
      // Refresh the agents list
      const activationsResponse = await fetch(`/api/tenants/${currentTenantId}/agent-activations`);
      if (activationsResponse.ok) {
        const activationsData = await activationsResponse.json();
        const activations = Array.isArray(activationsData) ? activationsData : [];
        
        activations.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        const mappedAgents: Agent[] = activations.map((activation: any, index: number) => {
          const variants: Array<'primary' | 'secondary' | 'accent'> = ['primary', 'secondary', 'accent'];
          const variant = variants[index % variants.length];

          let status: AgentStatus = 'inactive';
          if (activation.isActive && activation.activatedAt) {
            status = 'active';
          } else if (activation.deactivatedAt) {
            status = 'inactive';
          } else {
            status = 'inactive';
          }

          const referenceDate = activation.activatedAt || activation.createdAt;
          const createdAt = new Date(referenceDate);
          const now = new Date();
          const diffMs = now.getTime() - createdAt.getTime();
          const diffMinutes = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMinutes / 60);

          return {
            id: activation.id,
            name: activation.name,
            description: activation.description || `Agent instance for ${activation.agentName}`,
            status,
            template: activation.agentName,
            uptime: status === 'active' ? `${diffHours}h ${diffMinutes}m` : undefined,
            lastActive: status !== 'active' ? (diffHours > 0 ? `${diffHours}h ago` : `${diffMinutes}m ago`) : undefined,
            tasksCompleted: Math.floor(Math.random() * 100),
            variant,
          };
        });

        setAgents(mappedAgents);
      }
      
      setAgentToDeactivate(null);
    } catch (error) {
      console.error('[AgentsPage] Error deactivating instance:', error);
      showErrorToast(error, 'Failed to deactivate agent');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDeleteInstance = async () => {
    if (!currentTenantId || !agentToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/tenants/${currentTenantId}/agent-activations/${agentToDelete.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error(errorData.message || 'Cannot delete an active agent. Please deactivate it first.');
        }
        
        throw {
          status: response.status,
          message: errorData.message || errorData.error || 'Failed to delete agent instance',
          error: errorData.error,
          details: errorData.details,
        };
      }

      showSuccessToast(
        `Agent Deleted Successfully`,
        `${agentToDelete.name} has been permanently removed from your workspace`,
        {
          icon: '🗑️'
        }
      );
      
      setShowDeleteDialog(false);
      closeSlider();
      
      // Refresh the agents list
      setAgents((prevAgents) => prevAgents.filter((a) => a.id !== agentToDelete.id));
      setAgentToDelete(null);
    } catch (error) {
      console.error('[AgentsPage] Error deleting instance:', error);
      showErrorToast(error, 'Failed to delete agent instance');
    } finally {
      setIsDeleting(false);
    }
  };


  const handleActivateClick = async (agent: Agent) => {
    if (!currentTenantId) {
      showErrorToast(new Error('No tenant selected'), 'Failed to activate agent');
      return;
    }

    // Close the agent actions slider
    closeSlider();

    setIsLoadingWizard(true);
    setShowActivationWizard(true);

    try {
      // Fetch agent deployment details
      const response = await fetch(
        `/api/tenants/${currentTenantId}/agents/${encodeURIComponent(agent.template)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch agent deployment details');
      }

      const data = await response.json();

      // Filter workflows that have parameters and are activable
      const workflowsWithParams = data.definitions
        .filter((def: any) => 
          def.parameterDefinitions && 
          def.parameterDefinitions.length > 0 && 
          def.activable === true
        )
        .map((def: any) => ({
          id: def.id,
          workflowType: def.workflowType,
          name: def.name,
          summary: def.summary,
          parameterDefinitions: def.parameterDefinitions,
          activable: def.activable,
        }));

      setWizardData({
        agent: {
          id: data.agent.id,
          name: data.agent.name,
          description: data.agent.description,
        },
        workflows: workflowsWithParams,
      });

      setCurrentActivationId(agent.id);

      // Fetch the activation record to get existing workflowConfiguration
      try {
        const activationResponse = await fetch(
          `/api/tenants/${currentTenantId}/agent-activations`
        );

        if (activationResponse.ok) {
          const activations = await activationResponse.json();
          const currentActivation = Array.isArray(activations)
            ? activations.find((a: any) => a.id === agent.id)
            : null;

          if (currentActivation?.workflowConfiguration?.workflows) {
            // Pre-populate inputs from existing workflowConfiguration
            const existingInputs: Record<string, Record<string, string>> = {};

            currentActivation.workflowConfiguration.workflows.forEach((workflow: any) => {
              if (workflow.inputs && Array.isArray(workflow.inputs)) {
                existingInputs[workflow.workflowType] = {};
                workflow.inputs.forEach((input: any) => {
                  existingInputs[workflow.workflowType][input.name] = input.value;
                });
              }
            });

            console.log('[AgentsPage] Pre-populating inputs from activation record:', existingInputs);
            setWorkflowInputs(existingInputs);
          } else {
            setWorkflowInputs({});
          }
        } else {
          // If fetching activations fails, just start with empty inputs
          setWorkflowInputs({});
        }
      } catch (activationError) {
        console.warn('[AgentsPage] Failed to fetch activation record for pre-population:', activationError);
        // Continue with empty inputs if fetching activation fails
        setWorkflowInputs({});
      }
    } catch (error) {
      console.error('[AgentsPage] Error fetching agent deployment:', error);
      showErrorToast(error, 'Failed to load activation wizard');
      setShowActivationWizard(false);
    } finally {
      setIsLoadingWizard(false);
    }
  };

  const handleConfigWizardComplete = async (inputs: Record<string, Record<string, string>>) => {
    if (!currentTenantId || !wizardData || !currentActivationId) {
      return;
    }

    setIsActivating(true);

    try {
      // Build workflow configuration
      const workflows = wizardData.workflows.map((workflow) => {
        const workflowInputs = inputs[workflow.workflowType] || {};
        // Get valid parameter names from the current workflow definition
        const validParamNames = new Set(
          workflow.parameterDefinitions.map((param) => param.name)
        );
        
        // Filter inputs to only include parameters defined in the current workflow
        const filteredInputs = Object.entries(workflowInputs)
          .filter(([name]) => validParamNames.has(name))
          .map(([name, value]) => ({
            name,
            value,
          }));
        
        return {
          workflowType: workflow.workflowType,
          inputs: filteredInputs,
        };
      });

      const response = await fetch(
        `/api/tenants/${currentTenantId}/agent-activations/${currentActivationId}/activate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflowConfiguration: {
              workflows,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          message: errorData.error || errorData.message || 'Failed to activate agent',
          error: errorData.error,
          details: errorData.details,
        };
      }

      showSuccessToast(
        'Agent Activated Successfully',
        `${wizardData.agent.name} is now active and ready to use`,
        { icon: '✅' }
      );

      setShowActivationWizard(false);
      setWizardData(null);
      setWorkflowInputs({});
      setCurrentActivationId(null);
      closeSlider();

      // Refresh the agents list
      const activationsResponse = await fetch(`/api/tenants/${currentTenantId}/agent-activations`);
      if (activationsResponse.ok) {
        const activationsData = await activationsResponse.json();
        const activations = Array.isArray(activationsData) ? activationsData : [];
        
        activations.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        const mappedAgents: Agent[] = activations.map((activation: any, index: number) => {
          const variants: Array<'primary' | 'secondary' | 'accent'> = ['primary', 'secondary', 'accent'];
          const variant = variants[index % variants.length];

          let status: AgentStatus = 'inactive';
          if (activation.isActive && activation.activatedAt) {
            status = 'active';
          } else if (activation.deactivatedAt) {
            status = 'inactive';
          } else {
            status = 'inactive';
          }

          const referenceDate = activation.activatedAt || activation.createdAt;
          const createdAt = new Date(referenceDate);
          const now = new Date();
          const diffMs = now.getTime() - createdAt.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

          return {
            id: activation.id,
            name: activation.name,
            description: activation.description || `Agent instance for ${activation.agentName}`,
            status,
            template: activation.agentName,
            uptime: status === 'active' ? `${diffHours}h ${diffMinutes}m` : undefined,
            lastActive: status !== 'active' ? (diffHours > 0 ? `${diffHours}h ago` : `${diffMinutes}m ago`) : undefined,
            tasksCompleted: 0,
            variant,
          };
        });

        setAgents(mappedAgents);
      }
    } catch (error) {
      console.error('[AgentsPage] Error activating agent:', error);
      showErrorToast(error, 'Failed to activate agent');
    } finally {
      setIsActivating(false);
    }
  };

  // Get unique templates for filtering
  const uniqueTemplates = Array.from(new Set(agents.map((agent) => agent.template))).sort();
  
  // Filter agents based on selected template and status
  const filteredAgents = agents.filter((agent) => {
    // Filter by template if one is selected
    if (selectedTemplate && agent.template !== selectedTemplate) {
      return false;
    }
    // Filter by status if "Active" only is selected
    if (showActiveOnly && agent.status !== 'active') {
      return false;
    }
    return true;
  });

  // Generate color for template badge
  const getTemplateColor = (template: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800',
      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    ];
    const hash = template.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Agents</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your active AI agents
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/agent-store">
            <Play className="mr-2 h-4 w-4" />
            Add from Store
          </Link>
        </Button>
      </div>

      {/* Agent Filter Tags */}
      {!isLoading && agents.length > 0 && uniqueTemplates.length > 0 && (
        <Card className="p-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Filter by Agent Type</span>
              {selectedTemplate && (
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowActiveOnly(false);
                  }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* All/Active Switch */}
              <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                <button
                  className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${
                    !showActiveOnly 
                      ? 'bg-accent text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setShowActiveOnly(false)}
                >
                  <span className="flex items-center gap-1.5">
                    All
                    <span className="text-[10px] opacity-60">
                      ({agents.length})
                    </span>
                  </span>
                </button>
                <button
                  className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${
                    showActiveOnly 
                      ? 'bg-accent text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setShowActiveOnly(true)}
                >
                  <span className="flex items-center gap-1.5">
                    Active
                    <span className="text-[10px] opacity-60">
                      ({agents.filter(a => a.status === 'active').length})
                    </span>
                  </span>
                </button>
              </div>
              {uniqueTemplates.map((template) => {
                const count = agents.filter((agent) => 
                  agent.template === template && 
                  (!showActiveOnly || agent.status === 'active')
                ).length;
                const isSelected = selectedTemplate === template;
                
                return (
                  <button
                    key={template}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                      isSelected 
                        ? 'bg-accent border-border text-foreground' 
                        : 'bg-transparent border-dashed border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <span className="flex items-center gap-1.5 whitespace-normal break-words text-left">
                      <Bot className="h-3 w-3 flex-shrink-0" />
                      <span className="whitespace-normal break-words">{template}</span>
                      <span className="text-[10px] opacity-60 flex-shrink-0">
                        ({count})
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading agent activations...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && agents.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium">No Active Agents</h3>
            <p className="text-muted-foreground">
              You haven&apos;t activated any agents yet. Click &quot;Activate New Agent&quot; to get started.
            </p>
          </div>
        </Card>
      )}

      {/* Filtered Empty State */}
      {!isLoading && agents.length > 0 && filteredAgents.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium">No Agents Found</h3>
            <p className="text-muted-foreground">
              No agents match the selected filter. Try selecting a different agent type.
            </p>
            <Button variant="outline" onClick={() => {
              setSelectedTemplate(null);
              setShowActiveOnly(false);
            }}>
              Clear Filter
            </Button>
          </div>
        </Card>
      )}

      {/* Agents Grid */}
      {!isLoading && filteredAgents.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => {
            const isNewlyCreated = newlyCreatedId === agent.id;
            
            return (
          <Card 
            key={agent.id} 
            className={`hover:shadow-lg transition-all duration-300 cursor-pointer ${
              isNewlyCreated 
                ? 'border-2 border-green-500' 
                : ''
            }`}
            onClick={() => handleCardClick(agent)}
          >
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <IconAvatar icon={Bot} variant={agent.variant} size="lg" rounded="md" pulse={agent.status === 'active'} />
                <div className="flex flex-col gap-1.5 items-end">
                  {isNewlyCreated && (
                    <Badge 
                      variant="default" 
                      className="text-xs font-semibold bg-green-600 hover:bg-green-600"
                    >
                      NEW
                    </Badge>
                  )}
                  <Badge 
                    variant={AGENT_STATUS_CONFIG[agent.status].variant}
                    className={AGENT_STATUS_CONFIG[agent.status].colors.badge}
                  >
                    {AGENT_STATUS_CONFIG[agent.status].label}
                  </Badge>
                </div>
              </div>
              <div>
                <Badge variant="outline" className="font-semibold text-xs border whitespace-normal break-words bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                  {agent.template}
                </Badge>
              </div>
              <div className="space-y-4">
                <CardTitle className="whitespace-normal break-words">{agent.name}</CardTitle>
                <CardDescription className="whitespace-normal break-words">{agent.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2.5">
                {agent.uptime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-xs text-muted-foreground">Uptime:</span>
                    <span className="text-xs font-medium">{agent.uptime}</span>
                  </div>
                )}
                {agent.lastActive && (
                  <div className="text-sm">
                    <span className="text-xs text-muted-foreground">Last Modified: </span>
                    <span className="text-xs font-medium">{agent.lastActive}</span>
                  </div>
                )}
              </div>
              
            </CardContent>
          </Card>
            );
          })}
        </div>
      )}

      {/* Right Slider for Agent Actions */}
      <Sheet open={sliderType !== null} onOpenChange={closeSlider}>
        <SheetContent className="flex flex-col p-0">
          {selectedAgent && (
            <>
              {sliderType === 'actions' && selectedAgent.status === 'active' && (
                <>
                  <SheetHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-3">
                      <IconAvatar icon={Bot} variant={selectedAgent.variant} size="lg" rounded="md" />
                      <div className="flex-1 min-w-0">
                        <SheetTitle className="text-lg whitespace-normal break-words">{selectedAgent.name}</SheetTitle>
                        <SheetDescription className="text-sm mt-1 whitespace-normal break-words">
                          {selectedAgent.description}
                        </SheetDescription>
                        <div className="flex items-start gap-2 mt-2 flex-wrap">
                          <Badge 
                            variant={AGENT_STATUS_CONFIG[selectedAgent.status].variant}
                            className={AGENT_STATUS_CONFIG[selectedAgent.status].colors.badge}
                          >
                            {AGENT_STATUS_CONFIG[selectedAgent.status].label}
                          </Badge>
                          <Badge variant="outline" className="text-xs whitespace-normal break-words bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                            {selectedAgent.template}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </SheetHeader>

                  <Separator />

                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground mb-4">Agent Actions</h3>
                      
                      <Button
                        size="default"
                        variant="outline"
                        className="w-full justify-start transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/50 hover:translate-x-1 group h-auto py-3"
                        asChild
                      >
                        <Link href={`/conversations?agent-name=${encodeURIComponent(selectedAgent.template)}&activation-name=${encodeURIComponent(selectedAgent.name)}`}>
                          <MessageSquare className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">Talk to the Agent</div>
                            <div className="text-xs text-muted-foreground">Start a conversation</div>
                          </div>
                        </Link>
                      </Button>
                      
                      <Button
                        size="default"
                        variant="outline"
                        className="w-full justify-start transition-all hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/50 hover:translate-x-1 group h-auto py-3"
                        asChild
                      >
                        <Link href={`/tasks/pending?agent-name=${encodeURIComponent(selectedAgent.template)}&activation-name=${encodeURIComponent(selectedAgent.name)}&topic=general-discussions`}>
                          <ListTodo className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">See Agent Tasks</div>
                            <div className="text-xs text-muted-foreground">View all tasks</div>
                          </div>
                        </Link>
                      </Button>
                      
                      <Button
                        size="default"
                        variant="outline"
                        className="w-full justify-start transition-all hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500/50 hover:translate-x-1 group h-auto py-3"
                        asChild
                      >
                        <Link href={`/knowledge?agents=${encodeURIComponent(selectedAgent.name)}`}>
                          <BookOpen className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">View Agent Knowledge</div>
                            <div className="text-xs text-muted-foreground">Browse knowledge base</div>
                          </div>
                        </Link>
                      </Button>

                      <Separator className="my-4" />
                      
                      <Button
                        size="default"
                        variant="outline"
                        className="w-full justify-start transition-all hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-500/50 hover:translate-x-1 group h-auto py-3"
                        onClick={() => openSlider(selectedAgent, 'configure')}
                      >
                        <Settings className="mr-3 h-5 w-5 transition-transform group-hover:rotate-90" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Configure</div>
                          <div className="text-xs text-muted-foreground">Adjust agent settings</div>
                        </div>
                      </Button>
                      
                      <Button
                        size="default"
                        variant="outline"
                        className="w-full justify-start transition-all hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/50 hover:translate-x-1 group h-auto py-3"
                        onClick={() => openSlider(selectedAgent, 'activity')}
                      >
                        <Activity className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Activity Logs</div>
                          <div className="text-xs text-muted-foreground">View recent activity</div>
                        </div>
                      </Button>
                      
                      <Button
                        size="default"
                        variant="outline"
                        className="w-full justify-start transition-all hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/50 hover:translate-x-1 group h-auto py-3"
                        onClick={() => openSlider(selectedAgent, 'performance')}
                      >
                        <TrendingUp className="mr-3 h-5 w-5 transition-transform group-hover:scale-110 group-hover:translate-y-[-2px]" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Performance</div>
                          <div className="text-xs text-muted-foreground">View metrics & stats</div>
                        </div>
                      </Button>

                      <Separator className="my-4" />

                      <Button
                        size="default"
                        variant="outline"
                        className="w-full justify-start transition-all hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500/50 hover:translate-x-1 group h-auto py-3"
                        onClick={() => handleDeactivateClick(selectedAgent)}
                      >
                        <Power className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Deactivate Agent</div>
                          <div className="text-xs text-muted-foreground">Stop this agent instance</div>
                        </div>
                      </Button>

                      <Button
                        size="default"
                        variant="outline"
                        className="w-full justify-start transition-all hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/50 hover:translate-x-1 group h-auto py-3"
                        onClick={() => handleDeleteClick(selectedAgent)}
                        disabled={selectedAgent.status === 'active'}
                      >
                        <Trash2 className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Delete Instance</div>
                          <div className="text-xs text-muted-foreground">
                            {selectedAgent.status === 'active' 
                              ? 'Deactivate first to delete' 
                              : 'Permanently remove this agent'}
                          </div>
                        </div>
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {sliderType === 'actions' && selectedAgent.status === 'inactive' && (
                <>
                  <SheetHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-3">
                      <IconAvatar icon={Bot} variant={selectedAgent.variant} size="lg" rounded="md" />
                      <div className="flex-1 min-w-0">
                        <SheetTitle className="text-lg whitespace-normal break-words">{selectedAgent.name}</SheetTitle>
                        <SheetDescription className="text-sm mt-1 whitespace-normal break-words">
                          {selectedAgent.description}
                        </SheetDescription>
                        <div className="flex items-start gap-2 mt-2 flex-wrap">
                          <Badge 
                            variant={AGENT_STATUS_CONFIG[selectedAgent.status].variant}
                            className={AGENT_STATUS_CONFIG[selectedAgent.status].colors.badge}
                          >
                            {AGENT_STATUS_CONFIG[selectedAgent.status].label}
                          </Badge>
                          <Badge variant="outline" className="text-xs whitespace-normal break-words bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                            {selectedAgent.template}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </SheetHeader>


                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-4">
                      {/* Info Section */}
                      <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Agent is Inactive</h4>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                              This agent instance is currently deactivated and not running. Activate it to start using its capabilities.
                            </p>
                          </div>
                        </div>
                      </div>


                      {/* Actions */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground">Available Actions</h3>
                        
                        <Button
                          size="default"
                          variant="default"
                          className="w-full justify-start transition-all hover:translate-x-1 group h-auto py-3"
                          onClick={() => handleActivateClick(selectedAgent)}
                        >
                          <Power className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">Activate Agent</div>
                            <div className="text-xs opacity-90">Start this agent instance</div>
                          </div>
                        </Button>

                        <Separator className="my-4" />

                        <Button
                          size="default"
                          variant="outline"
                          className="w-full justify-start transition-all hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/50 hover:translate-x-1 group h-auto py-3"
                          onClick={() => handleDeleteClick(selectedAgent)}
                        >
                          <Trash2 className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">Delete Instance</div>
                            <div className="text-xs text-muted-foreground">Permanently remove this agent</div>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {sliderType === 'configure' && (
                <>
                  <SheetHeader className="px-6 pt-6">
                    <SheetTitle className="text-base">Configure Agent</SheetTitle>
                    <SheetDescription className="text-sm whitespace-normal break-words">{selectedAgent.name}</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
                    <div className="space-y-5">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Agent Name</label>
                          <input
                            type="text"
                            defaultValue={selectedAgent.name}
                            className="w-full mt-1.5 px-3 py-2 text-sm border rounded-md bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Description</label>
                          <textarea
                            defaultValue={selectedAgent.description}
                            className="w-full mt-1.5 px-3 py-2 text-sm border rounded-md bg-background resize-none"
                            rows={2}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-3">Behavior</h3>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Auto-respond</span>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Task automation</span>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Learning mode</span>
                            <input type="checkbox" className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-3">Performance</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Response delay (ms)</label>
                            <input
                              type="number"
                              defaultValue={500}
                              className="w-full mt-1.5 px-3 py-2 text-sm border rounded-md bg-background"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Max concurrent tasks</label>
                            <input
                              type="number"
                              defaultValue={5}
                              className="w-full mt-1.5 px-3 py-2 text-sm border rounded-md bg-background"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />
                      
                      <Button className="w-full">Save Configuration</Button>
                    </div>
                  </div>
                </>
              )}

              {sliderType === 'activity' && (
                <>
                  <SheetHeader className="px-6 pt-6">
                    <SheetTitle className="text-base">Activity Logs</SheetTitle>
                    <SheetDescription className="text-sm whitespace-normal break-words">{selectedAgent.name}</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
                    <div className="space-y-3">
                    {[
                      {
                        time: '2 minutes ago',
                        type: 'success',
                        message: 'Completed task: Process customer inquiry #1234',
                      },
                      {
                        time: '15 minutes ago',
                        type: 'info',
                        message: 'Started conversation with user John Doe',
                      },
                      {
                        time: '1 hour ago',
                        type: 'success',
                        message: 'Completed task: Generate monthly report',
                      },
                      {
                        time: '2 hours ago',
                        type: 'warning',
                        message: 'Retry attempt for task #5678',
                      },
                      {
                        time: '3 hours ago',
                        type: 'success',
                        message: 'Processed 15 customer support tickets',
                      },
                      {
                        time: '5 hours ago',
                        type: 'info',
                        message: 'Agent started and initialized',
                      },
                    ].map((log, index) => (
                      <div key={index} className="flex gap-2.5 pb-3 border-b last:border-0">
                        <div className="flex-shrink-0 mt-0.5">
                          {log.type === 'success' && (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          )}
                          {log.type === 'info' && (
                            <Activity className="h-3.5 w-3.5 text-blue-600" />
                          )}
                          {log.type === 'warning' && (
                            <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">{log.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.time}
                          </p>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                </>
              )}

              {sliderType === 'performance' && (
                <>
                  <SheetHeader className="px-6 pt-6">
                    <SheetTitle className="text-base">Performance Metrics</SheetTitle>
                    <SheetDescription className="text-sm whitespace-normal break-words">{selectedAgent.name}</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
                    <div className="space-y-5">
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-3">Overall Performance</h3>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Success Rate</span>
                          <span className="text-base font-semibold text-green-600">98.5%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Avg Response Time</span>
                          <span className="text-base font-semibold">1.2s</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Tasks Completed</span>
                          <span className="text-base font-semibold">{selectedAgent.tasksCompleted}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-3">Today</h3>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Messages</span>
                          <span className="font-medium">234</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tasks</span>
                          <span className="font-medium">42</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Conversations</span>
                          <span className="font-medium">12</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Error Rate</span>
                          <span className="font-medium text-green-600">0.3%</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-3">This Week</h3>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Uptime</span>
                          <span className="font-medium">156h 24m</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Efficiency Trend</span>
                          <span className="font-medium text-green-600">↑ 2.5%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Peak Hours</span>
                          <span className="font-medium">9AM - 5PM</span>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Power className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <DialogTitle>Deactivate Agent Instance</DialogTitle>
                <DialogDescription className="mt-1">
                  Stop this agent from running
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-4">
              <p className="text-sm text-foreground">
                Are you sure you want to deactivate{' '}
                <span className="font-semibold text-orange-900 dark:text-orange-200">
                  {agentToDeactivate?.name}
                </span>
                ?
              </p>
              {agentToDeactivate?.description && (
                <p className="text-xs text-muted-foreground mt-2">
                  {agentToDeactivate.description}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-900">
                <p className="text-xs text-muted-foreground">
                  This will stop the agent from processing new tasks and conversations. You can reactivate it later.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeactivateDialog(false)}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleDeactivate}
              disabled={isDeactivating}
            >
              {isDeactivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  Deactivate Agent
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <DialogTitle>Delete Agent Instance</DialogTitle>
                <DialogDescription className="mt-1">
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            {agentToDelete?.status === 'active' && (
              <div className="rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-900 dark:text-orange-200">Agent is Active</h4>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                      This agent is currently running. You must deactivate it before you can delete it.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm text-foreground">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-destructive">
                  {agentToDelete?.name}
                </span>
                ?
              </p>
              {agentToDelete?.description && (
                <p className="text-xs text-muted-foreground mt-2">
                  {agentToDelete.description}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-destructive/10">
                <p className="text-xs text-muted-foreground">
                  All conversations, tasks, and activity logs associated with this agent instance will be permanently deleted.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInstance}
              disabled={isDeleting || agentToDelete?.status === 'active'}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Instance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activation Wizard */}
      <ActivationConfigWizard
        open={showActivationWizard}
        onOpenChange={setShowActivationWizard}
        wizardData={wizardData}
        isLoading={isLoadingWizard}
        initialWorkflowInputs={workflowInputs}
        onComplete={handleConfigWizardComplete}
        onCancel={() => {
          setShowActivationWizard(false);
          setWizardData(null);
          setWorkflowInputs({});
          setCurrentActivationId(null);
        }}
      />
    </div>
  );
}
