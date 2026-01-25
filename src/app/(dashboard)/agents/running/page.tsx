'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Bot, Play, Loader2 } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import { ActivationConfigWizard, ActivationWizardData } from '@/components/features/agents/activation-config-wizard';

import { Agent, SliderType } from './types';
import { useAgents } from './hooks/use-agents';
import { AgentCard } from './components/agent-card';
import { AgentFilters } from './components/agent-filters';
import { AgentActionsSlider } from './components/agent-actions-slider';
import { AgentDeleteDialog } from './components/agent-delete-dialog';
import { AgentDeactivateDialog } from './components/agent-deactivate-dialog';
import { ConfigurePanel, ActivityPanel, PerformancePanel } from './components/agent-slider-panels';

export default function AgentsPage() {
  const { currentTenantId } = useTenant();
  const { user } = useAuth();
  const { agents, isLoading, refreshAgents, setAgents } = useAgents(currentTenantId);
  
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
  const [showMyAgentsOnly, setShowMyAgentsOnly] = useState(false);
  
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
        const timer = setTimeout(() => setNewlyCreatedId(null), 10000);
        window.history.replaceState({}, '', window.location.pathname);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Restore selected agent from URL params
  useEffect(() => {
    if (typeof window !== 'undefined' && agents.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const agentName = params.get('agentName');
      const activationName = params.get('activationName');
      
      if (agentName && activationName) {
        const agent = agents.find(
          (a) => a.template === agentName && a.name === activationName
        );
        if (agent) {
          setSelectedAgent(agent);
          setSliderType('actions');
        }
      }
    }
  }, [agents]);

  const openSlider = (agent: Agent, type: SliderType = 'actions') => {
    setSelectedAgent(agent);
    setSliderType(type);
    
    // Update URL with agent info
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('agentName', agent.template);
      params.set('activationName', agent.name);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  };

  const closeSlider = () => {
    setSliderType(null);
    setSelectedAgent(null);
    
    // Remove agent params from URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.delete('agentName');
      params.delete('activationName');
      const newUrl = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
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
    if (!currentTenantId || !agentToDeactivate) return;

    setIsDeactivating(true);
    try {
      const response = await fetch(
        `/api/tenants/${currentTenantId}/agent-activations/${agentToDeactivate.id}/deactivate`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to deactivate agent');
      }

      showSuccessToast(
        `Agent Deactivated`,
        `${agentToDeactivate.name} has been deactivated and stopped running`,
        { icon: '⏸️' }
      );
      
      setShowDeactivateDialog(false);
      closeSlider();
      await refreshAgents();
      setAgentToDeactivate(null);
    } catch (error) {
      console.error('[AgentsPage] Error deactivating instance:', error);
      showErrorToast(error, 'Failed to deactivate agent');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDeleteInstance = async () => {
    if (!currentTenantId || !agentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/tenants/${currentTenantId}/agent-activations/${agentToDelete.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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
        { icon: '🗑️' }
      );
      
      setShowDeleteDialog(false);
      closeSlider();
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

    closeSlider();
    setIsLoadingWizard(true);

    try {
      // Step 1: Fetch agent deployment details
      const response = await fetch(
        `/api/tenants/${currentTenantId}/agents/${encodeURIComponent(agent.template)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch agent deployment details');
      }

      const data = await response.json();

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

      // Step 2: Fetch existing workflow configuration to pre-populate the wizard
      // This MUST happen before opening the wizard to avoid race conditions
      let existingInputs: Record<string, Record<string, string>> = {};
      
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
            // Extract existing inputs from the saved configuration
            currentActivation.workflowConfiguration.workflows.forEach((workflow: any) => {
              if (workflow.inputs && Array.isArray(workflow.inputs)) {
                existingInputs[workflow.workflowType] = {};
                workflow.inputs.forEach((input: any) => {
                  existingInputs[workflow.workflowType][input.name] = input.value;
                });
              }
            });
            console.log('[AgentsPage] Pre-populating wizard with saved inputs:', existingInputs);
          } else {
            console.log('[AgentsPage] No existing workflow configuration found, starting with empty inputs');
          }
        } else {
          console.warn('[AgentsPage] Failed to fetch activations for pre-population');
        }
      } catch (activationError) {
        console.warn('[AgentsPage] Failed to fetch activation record for pre-population:', activationError);
      }

      // Step 3: Set all state and THEN open the wizard
      // This ensures the wizard receives the pre-populated inputs immediately
      setWizardData({
        agent: {
          id: data.agent.id,
          name: data.agent.name,
          description: data.agent.description,
        },
        workflows: workflowsWithParams,
      });
      setCurrentActivationId(agent.id);
      setWorkflowInputs(existingInputs);
      
      // Only open the wizard after all data is ready
      setShowActivationWizard(true);
      
    } catch (error) {
      console.error('[AgentsPage] Error fetching agent deployment:', error);
      showErrorToast(error, 'Failed to load activation wizard');
    } finally {
      setIsLoadingWizard(false);
    }
  };

  const handleConfigWizardComplete = async (inputs: Record<string, Record<string, string>>) => {
    if (!currentTenantId || !wizardData || !currentActivationId) return;

    setIsActivating(true);
    try {
      const workflows = wizardData.workflows.map((workflow) => {
        const workflowInputs = inputs[workflow.workflowType] || {};
        const validParamNames = new Set(
          workflow.parameterDefinitions.map((param) => param.name)
        );
        
        const filteredInputs = Object.entries(workflowInputs)
          .filter(([name]) => validParamNames.has(name))
          .map(([name, value]) => ({ name, value }));
        
        return {
          workflowType: workflow.workflowType,
          inputs: filteredInputs,
        };
      });

      const response = await fetch(
        `/api/tenants/${currentTenantId}/agent-activations/${currentActivationId}/activate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowConfiguration: { workflows } }),
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
      await refreshAgents();
    } catch (error) {
      console.error('[AgentsPage] Error activating agent:', error);
      showErrorToast(error, 'Failed to activate agent');
    } finally {
      setIsActivating(false);
    }
  };

  const uniqueTemplates = Array.from(new Set(agents.map((agent) => agent.template))).sort();
  
  const filteredAgents = agents.filter((agent) => {
    if (selectedTemplate && agent.template !== selectedTemplate) return false;
    if (showActiveOnly && agent.status !== 'active') return false;
    if (showMyAgentsOnly && agent.participantId !== user?.email) return false;
    return true;
  });

  const handleClearFilters = () => {
    setSelectedTemplate(null);
    setShowActiveOnly(false);
    setShowMyAgentsOnly(false);
  };

  const handleTemplateSelect = (template: string) => {
    // Toggle behavior: if already selected, deselect it
    setSelectedTemplate(selectedTemplate === template ? null : template);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Agents</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your AI agents
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
        <AgentFilters
          agents={agents}
          uniqueTemplates={uniqueTemplates}
          selectedTemplate={selectedTemplate}
          showActiveOnly={showActiveOnly}
          showMyAgentsOnly={showMyAgentsOnly}
          currentUserEmail={user?.email}
          onTemplateSelect={handleTemplateSelect}
          onClearFilters={handleClearFilters}
          onToggleActiveOnly={setShowActiveOnly}
          onToggleMyAgentsOnly={setShowMyAgentsOnly}
        />
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
        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-6 space-y-3">
            <div className="rounded-full bg-muted/50 p-3">
              <Bot className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">No agents</p>
              <p className="text-xs text-muted-foreground">
                You haven&apos;t activated any agents yet. Click &quot;Add from Store&quot; to get started.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filtered Empty State */}
      {!isLoading && agents.length > 0 && filteredAgents.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-6 space-y-3">
            <div className="rounded-full bg-muted/50 p-3">
              <Bot className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">No matching agents</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your filters to see more agents
              </p>
            </div>
            <Button variant="outline" onClick={handleClearFilters} className="mt-2">
              Clear Filter
            </Button>
          </div>
        </Card>
      )}

      {/* Agents Grid */}
      {!isLoading && filteredAgents.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isNewlyCreated={newlyCreatedId === agent.id}
              currentUserEmail={user?.email}
              onClick={() => handleCardClick(agent)}
            />
          ))}
        </div>
      )}

      {/* Right Slider for Agent Actions */}
      <Sheet open={sliderType !== null} onOpenChange={closeSlider}>
        {selectedAgent && sliderType === 'actions' && (
          <AgentActionsSlider
            agent={selectedAgent}
            sliderType={sliderType}
            onSliderTypeChange={setSliderType}
            onActivateClick={() => handleActivateClick(selectedAgent)}
            onDeactivateClick={() => handleDeactivateClick(selectedAgent)}
            onDeleteClick={() => handleDeleteClick(selectedAgent)}
          />
        )}
        {selectedAgent && sliderType === 'configure' && (
          <ConfigurePanel 
            agent={selectedAgent} 
            tenantId={currentTenantId}
            onDeactivate={() => {
              closeSlider();
              handleDeactivateClick(selectedAgent);
            }}
          />
        )}
        {selectedAgent && sliderType === 'activity' && (
          <ActivityPanel agent={selectedAgent} />
        )}
        {selectedAgent && sliderType === 'performance' && (
          <PerformancePanel agent={selectedAgent} />
        )}
      </Sheet>

      {/* Deactivate Confirmation Dialog */}
      <AgentDeactivateDialog
        open={showDeactivateDialog}
        agent={agentToDeactivate}
        isDeactivating={isDeactivating}
        onOpenChange={setShowDeactivateDialog}
        onConfirm={handleDeactivate}
      />

      {/* Delete Confirmation Dialog */}
      <AgentDeleteDialog
        open={showDeleteDialog}
        agent={agentToDelete}
        isDeleting={isDeleting}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteInstance}
      />

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
