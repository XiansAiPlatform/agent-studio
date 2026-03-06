'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Bot, Play, Loader2 } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import { ActivationConfigWizard } from '@/components/features/agents/activation-config-wizard';

import { Agent, SliderType } from './types';
import { useAgents } from './hooks/use-agents';
import { useActivationWizard } from './hooks/use-activation-wizard';
import { AgentCard } from './components/agent-card';
import { AgentFilters } from './components/agent-filters';
import { AgentActionsSlider } from './components/agent-actions-slider';
import { AgentDeleteDialog } from './components/agent-delete-dialog';
import { AgentDeactivateDialog } from './components/agent-deactivate-dialog';
import { ConfigurePanel } from './components/agent-slider-panels';
import { EmptyState } from './components/empty-state';

function AgentsPageContent() {
  const { currentTenantId } = useTenant();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
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

  const closeSlider = useCallback(() => {
    setSliderType(null);
    setSelectedAgent(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('agentName');
    params.delete('activationName');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [searchParams, pathname, router]);

  const openSlider = useCallback(
    (agent: Agent, type: SliderType = 'actions') => {
      setSelectedAgent(agent);
      setSliderType(type);
      const params = new URLSearchParams(searchParams.toString());
      params.set('agentName', agent.template);
      params.set('activationName', agent.name);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const {
    showActivationWizard,
    setShowActivationWizard,
    wizardData,
    isLoadingWizard,
    workflowInputs,
    isActivating,
    handleActivateClick,
    handleConfigWizardComplete,
    handleWizardCancel,
  } = useActivationWizard(currentTenantId, {
    onClose: closeSlider,
    onSuccess: refreshAgents,
  });

  // Check for newly created instance from URL params
  useEffect(() => {
    const newInstanceId = searchParams.get('newInstance');
    if (newInstanceId) {
      setNewlyCreatedId(newInstanceId);
      const timer = setTimeout(() => setNewlyCreatedId(null), 10000);
      router.replace(pathname);
      return () => clearTimeout(timer);
    }
  }, [searchParams, pathname, router]);

  // Restore selected agent from URL params when agents load
  useEffect(() => {
    if (agents.length === 0) return;
    const agentName = searchParams.get('agentName');
    const activationName = searchParams.get('activationName');
    if (agentName && activationName) {
      const agent = agents.find(
        (a) => a.template === agentName && a.name === activationName
      );
      if (agent) {
        setSelectedAgent(agent);
        setSliderType('actions');
      }
    }
  }, [agents, searchParams]);

  const handleCardClick = useCallback((agent: Agent) => {
    openSlider(agent, 'actions');
  }, [openSlider]);

  const handleDeleteClick = useCallback((agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteDialog(true);
  }, []);

  const handleDeactivateClick = useCallback((agent: Agent) => {
    setAgentToDeactivate(agent);
    setShowDeactivateDialog(true);
  }, []);

  const handleDeactivate = useCallback(async () => {
    if (!currentTenantId || !agentToDeactivate) return;

    setIsDeactivating(true);
    try {
      const response = await fetch(
        `/api/agent-activations/${agentToDeactivate.id}/deactivate`,
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
      showErrorToast(error, 'Failed to deactivate agent');
    } finally {
      setIsDeactivating(false);
    }
  }, [currentTenantId, agentToDeactivate, closeSlider, refreshAgents]);

  const handleDeleteInstance = useCallback(async () => {
    if (!currentTenantId || !agentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/agent-activations/${agentToDelete.id}`,
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
      showErrorToast(error, 'Failed to delete agent instance');
    } finally {
      setIsDeleting(false);
    }
  }, [currentTenantId, agentToDelete, closeSlider, setAgents]);

  const uniqueTemplates = useMemo(
    () => Array.from(new Set(agents.map((a) => a.template))).sort(),
    [agents]
  );

  const filteredAgents = useMemo(
    () =>
      agents.filter((agent) => {
        if (selectedTemplate && agent.template !== selectedTemplate) return false;
        if (showActiveOnly && agent.status !== 'active') return false;
        if (showMyAgentsOnly && agent.participantId !== user?.email) return false;
        return true;
      }),
    [agents, selectedTemplate, showActiveOnly, showMyAgentsOnly, user?.email]
  );

  const handleClearFilters = useCallback(() => {
    setSelectedTemplate(null);
    setShowActiveOnly(false);
    setShowMyAgentsOnly(false);
  }, []);

  const handleTemplateSelect = useCallback((template: string) => {
    setSelectedTemplate((prev) => (prev === template ? null : template));
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Agents</h1>
          <p className="text-muted-foreground mt-1">
            Collaborate with your AI agent coworkers
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/agent-store">
            <Play className="mr-2 h-4 w-4" />
            Activate from Store
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
        <EmptyState
          icon={Bot}
          title="No activated agents"
          description={`You haven't activated any agents yet. Click "Activate from Store" to get started.`}
        />
      )}

      {/* Filtered Empty State */}
      {!isLoading && agents.length > 0 && filteredAgents.length === 0 && (
        <EmptyState
          icon={Bot}
          title="No matching agents"
          description="Try adjusting your filters to see more agents"
          action={{ label: 'Clear Filter', onClick: handleClearFilters }}
        />
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
      <Sheet
        open={sliderType !== null}
        onOpenChange={(open) => !open && closeSlider()}
      >
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
        isSubmitting={isActivating}
        initialWorkflowInputs={workflowInputs}
        onComplete={handleConfigWizardComplete}
        onCancel={handleWizardCancel}
      />
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6 flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <AgentsPageContent />
    </Suspense>
  );
}
