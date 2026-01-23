'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Bot, Play, Loader2 } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
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
    setShowActivationWizard(true);

    try {
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

      setWizardData({
        agent: {
          id: data.agent.id,
          name: data.agent.name,
          description: data.agent.description,
        },
        workflows: workflowsWithParams,
      });

      setCurrentActivationId(agent.id);

      // Fetch existing workflow configuration
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
            const existingInputs: Record<string, Record<string, string>> = {};
            currentActivation.workflowConfiguration.workflows.forEach((workflow: any) => {
              if (workflow.inputs && Array.isArray(workflow.inputs)) {
                existingInputs[workflow.workflowType] = {};
                workflow.inputs.forEach((input: any) => {
                  existingInputs[workflow.workflowType][input.name] = input.value;
                });
              }
            });
            setWorkflowInputs(existingInputs);
          } else {
            setWorkflowInputs({});
          }
        } else {
          setWorkflowInputs({});
        }
      } catch (activationError) {
        console.warn('[AgentsPage] Failed to fetch activation record:', activationError);
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
    return true;
  });

  const handleClearFilters = () => {
    setSelectedTemplate(null);
    setShowActiveOnly(false);
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
        <AgentFilters
          agents={agents}
          uniqueTemplates={uniqueTemplates}
          selectedTemplate={selectedTemplate}
          showActiveOnly={showActiveOnly}
          onTemplateSelect={setSelectedTemplate}
          onClearFilters={handleClearFilters}
          onToggleActiveOnly={setShowActiveOnly}
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
        <Card className="p-12">
          <div className="text-center space-y-3">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium">No Active Agents</h3>
            <p className="text-muted-foreground">
              You haven&apos;t activated any agents yet. Click &quot;Add from Store&quot; to get started.
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
            <Button variant="outline" onClick={handleClearFilters}>
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
          <ConfigurePanel agent={selectedAgent} />
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
