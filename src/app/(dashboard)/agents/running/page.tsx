'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParticipantLayout } from '@/contexts/participant-layout-context';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { Bot, Play, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useEditableAgents, canEditAgent } from '@/hooks/use-editable-agents';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import { ActivationConfigWizard } from '@/components/features/agents/activation-config-wizard';

import { Agent, SliderType } from './types';
import { useAgents } from './hooks/use-agents';
import { useActivationWizard } from './hooks/use-activation-wizard';
import { AgentCard } from './components/agent-card';
import { AgentFilters } from './components/agent-filters';
import { AgentActionsSlider } from './components/agent-actions-slider';
import { AgentUndeployDialog } from './components/agent-undeploy-dialog';
import { AgentDeactivateDialog } from './components/agent-deactivate-dialog';
import { AgentReactivateDialog } from './components/agent-reactivate-dialog';
import { AgentRedeployDialog } from './components/agent-redeploy-dialog';
import { ConfigurePanel } from './components/agent-slider-panels';
import { EmptyState } from './components/empty-state';

/**
 * One entry per associated-data checkbox in AgentUndeployDialog, in the exact order of
 * ASSOCIATED_DATA_OPTIONS there. Progress steps prepend a deactivate step when the agent
 * is active, then undeploy, then these categories (1:1 with checkbox order).
 */
const ASSOCIATED_DATA_DELETE_CONFIG: {
  id: string;
  label: string;
  buildUrl: (agentName: string, activationName: string) => string;
}[] = [
  {
    id: 'integrations',
    label: 'App Integrations',
    buildUrl: (agentName, activationName) =>
      `/api/webhooks/agents/${encodeURIComponent(agentName)}/activation/${encodeURIComponent(activationName)}`,
  },
  {
    id: 'messages',
    label: 'Messages',
    buildUrl: (agentName, activationName) =>
      `/api/messaging/agents/${encodeURIComponent(agentName)}/activation/${encodeURIComponent(activationName)}`,
  },
  {
    id: 'documents',
    label: 'Documents',
    buildUrl: (agentName, activationName) =>
      `/api/data/agents/${encodeURIComponent(agentName)}/activation/${encodeURIComponent(activationName)}`,
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    buildUrl: (agentName, activationName) =>
      `/api/knowledge/agents/${encodeURIComponent(agentName)}/activation/${encodeURIComponent(activationName)}`,
  },
  {
    id: 'logs',
    label: 'Logs',
    buildUrl: (agentName, activationName) =>
      `/api/logs/agents/${encodeURIComponent(agentName)}/activation/${encodeURIComponent(activationName)}`,
  },
  {
    id: 'schedules',
    label: 'Schedules',
    buildUrl: (agentName, activationName) =>
      `/api/schedules/agents/${encodeURIComponent(agentName)}/activation/${encodeURIComponent(activationName)}`,
  },
  {
    id: 'performance',
    label: 'Performance Metrics',
    buildUrl: (agentName, activationName) =>
      `/api/metrics/agents/${encodeURIComponent(agentName)}/activation/${encodeURIComponent(activationName)}`,
  },
  {
    id: 'feedback',
    label: 'Feedback',
    buildUrl: (agentName, activationName) =>
      `/api/messaging/feedback/agents/${encodeURIComponent(agentName)}/activation/${encodeURIComponent(activationName)}`,
  },
];

function AgentsPageContent() {
  const { currentTenantId } = useTenant();
  const { isParticipantMode } = useParticipantLayout();
  const canAccessSettings = !isParticipantMode;
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { agents, isLoading, refreshAgents, setAgents } = useAgents(currentTenantId);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [sliderType, setSliderType] = useState<SliderType>(null);
  const editableAgents = useEditableAgents();
  const selectedAgentEditable =
    !!selectedAgent && canEditAgent(editableAgents, selectedAgent.template);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [showUndeployDialog, setShowUndeployDialog] = useState(false);
  const [agentToUndeploy, setAgentToUndeploy] = useState<Agent | null>(null);
  const [isUndeploying, setIsUndeploying] = useState(false);
  const [undeployStepIndex, setUndeployStepIndex] = useState(-1);
  const [undeployFailed, setUndeployFailed] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [agentToDeactivate, setAgentToDeactivate] = useState<Agent | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateStepIndex, setDeactivateStepIndex] = useState(-1);
  const [deactivateFailed, setDeactivateFailed] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [agentToReactivate, setAgentToReactivate] = useState<Agent | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);
  const [reactivateStepIndex, setReactivateStepIndex] = useState(-1);
  const [reactivateFailed, setReactivateFailed] = useState(false);
  const [showRedeployDialog, setShowRedeployDialog] = useState(false);
  const [agentToRedeploy, setAgentToRedeploy] = useState<Agent | null>(null);
  const [isRedeploying, setIsRedeploying] = useState(false);
  const [redeployStepIndex, setRedeployStepIndex] = useState(-1);
  const [redeployFailed, setRedeployFailed] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showMyAgentsOnly, setShowMyAgentsOnly] = useState(false);
  const [showInactiveSection, setShowInactiveSection] = useState(false);

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

  const handleUndeployClick = useCallback((agent: Agent) => {
    setAgentToUndeploy(agent);
    setUndeployStepIndex(-1);
    setUndeployFailed(false);
    setShowUndeployDialog(true);
  }, []);

  const handleDeactivateClick = useCallback((agent: Agent) => {
    setAgentToDeactivate(agent);
    setDeactivateStepIndex(-1);
    setDeactivateFailed(false);
    setShowDeactivateDialog(true);
  }, []);

  const handleDeactivate = useCallback(async () => {
    if (!currentTenantId || !agentToDeactivate) return;

    setIsDeactivating(true);
    setDeactivateFailed(false);
    setDeactivateStepIndex(0);
    try {
      const response = await fetch(
        `/api/agent-activations/${agentToDeactivate.id}/deactivate`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to deactivate agent');
      }

      setDeactivateStepIndex(1);
      showSuccessToast(
        `Agent Deactivated`,
        `${agentToDeactivate.name} has been deactivated and stopped running`,
        { icon: '⏸️' }
      );
      
      setShowDeactivateDialog(false);
      closeSlider();
      await refreshAgents();
      setAgentToDeactivate(null);
      setDeactivateStepIndex(-1);
    } catch (error) {
      setDeactivateFailed(true);
      showErrorToast(error, 'Failed to deactivate agent');
    } finally {
      setIsDeactivating(false);
    }
  }, [currentTenantId, agentToDeactivate, closeSlider, refreshAgents]);

  const handleReactivateClick = useCallback((agent: Agent) => {
    setAgentToReactivate(agent);
    setReactivateStepIndex(-1);
    setReactivateFailed(false);
    setShowReactivateDialog(true);
  }, []);

  const handleReactivate = useCallback(async () => {
    if (!currentTenantId || !agentToReactivate) return;

    setIsReactivating(true);
    setReactivateFailed(false);
    setReactivateStepIndex(0);
    try {
      const activationsResponse = await fetch('/api/agent-activations');
      if (!activationsResponse.ok) {
        throw new Error('Failed to load current agent configuration');
      }

      const activationsData = await activationsResponse.json();
      const activations = Array.isArray(activationsData)
        ? activationsData
        : activationsData.data || activationsData.activations || [];
      const currentActivation = activations.find(
        (a: { id: string }) => a.id === agentToReactivate.id
      );
      const workflowConfiguration = currentActivation?.workflowConfiguration ?? {
        workflows: [],
      };

      setReactivateStepIndex(1);
      const deactivateResponse = await fetch(
        `/api/agent-activations/${agentToReactivate.id}/deactivate`,
        { method: 'POST' }
      );
      if (!deactivateResponse.ok) {
        const errorData = await deactivateResponse.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || 'Failed to deactivate agent'
        );
      }

      setReactivateStepIndex(2);
      const activateResponse = await fetch(
        `/api/agent-activations/${agentToReactivate.id}/activate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowConfiguration }),
        }
      );
      if (!activateResponse.ok) {
        const errorData = await activateResponse.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            errorData.error ||
            'Agent was deactivated but failed to reactivate. Activate it manually to continue.'
        );
      }

      setReactivateStepIndex(3);
      showSuccessToast(
        'Agent Reactivated',
        `${agentToReactivate.name} has been deactivated and activated again`,
        { icon: '🔄' }
      );

      setShowReactivateDialog(false);
      closeSlider();
      await refreshAgents();
      setAgentToReactivate(null);
      setReactivateStepIndex(-1);
    } catch (error) {
      setReactivateFailed(true);
      showErrorToast(error, 'Failed to reactivate agent');
      await refreshAgents();
    } finally {
      setIsReactivating(false);
    }
  }, [currentTenantId, agentToReactivate, closeSlider, refreshAgents]);

  const handleRedeployClick = useCallback((agent: Agent) => {
    setAgentToRedeploy(agent);
    setRedeployStepIndex(-1);
    setRedeployFailed(false);
    setShowRedeployDialog(true);
  }, []);

  const handleRedeploy = useCallback(async () => {
    if (!currentTenantId || !agentToRedeploy) return;

    setIsRedeploying(true);
    setRedeployFailed(false);
    setRedeployStepIndex(0);
    try {
      const activationsResponse = await fetch('/api/agent-activations');
      if (!activationsResponse.ok) {
        throw new Error('Failed to load current agent configuration');
      }

      const activationsData = await activationsResponse.json();
      const activations = Array.isArray(activationsData)
        ? activationsData
        : activationsData.data || activationsData.activations || [];
      const currentActivation = activations.find(
        (a: { id: string }) => a.id === agentToRedeploy.id
      );

      if (!currentActivation) {
        throw new Error('Could not find the current agent activation');
      }

      const name = currentActivation.name || agentToRedeploy.name;
      const agentName = currentActivation.agentName || agentToRedeploy.template;
      const description = currentActivation.description || undefined;
      const workflowConfiguration = currentActivation.workflowConfiguration ?? {
        workflows: [],
      };

      let step = 1;
      if (agentToRedeploy.status === 'active') {
        setRedeployStepIndex(step);
        const deactivateResponse = await fetch(
          `/api/agent-activations/${agentToRedeploy.id}/deactivate`,
          { method: 'POST' }
        );
        if (!deactivateResponse.ok) {
          const errorData = await deactivateResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message || errorData.error || 'Failed to deactivate agent'
          );
        }
        step += 1;
      }

      setRedeployStepIndex(step);
      const deleteResponse = await fetch(
        `/api/agent-activations/${agentToRedeploy.id}`,
        { method: 'DELETE' }
      );
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || 'Failed to undeploy agent instance'
        );
      }
      step += 1;

      setRedeployStepIndex(step);
      const createResponse = await fetch('/api/agent-activations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          agentName,
          description,
          workflowConfiguration:
            workflowConfiguration.workflows?.length > 0
              ? workflowConfiguration
              : undefined,
        }),
      });

      const createResult = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) {
        throw new Error(
          createResult.message ||
            createResult.error ||
            'Agent was undeployed but failed to deploy a new instance. Create a new instance from the Agent Store.'
        );
      }

      const newInstanceId = createResult.id || createResult.activationId;
      if (!newInstanceId) {
        throw new Error(
          'Agent was redeployed but no instance ID was returned. Check Agents to continue.'
        );
      }
      step += 1;

      setRedeployStepIndex(step);
      const activateResponse = await fetch(
        `/api/agent-activations/${newInstanceId}/activate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflowConfiguration:
              workflowConfiguration.workflows?.length > 0
                ? workflowConfiguration
                : undefined,
          }),
        }
      );
      if (!activateResponse.ok) {
        const errorData = await activateResponse.json().catch(() => ({}));
        setRedeployFailed(true);
        showErrorToast(
          new Error(
            errorData.message ||
              errorData.error ||
              'Failed to activate redeployed instance'
          ),
          'Instance redeployed but activation failed'
        );
        setShowRedeployDialog(false);
        closeSlider();
        setNewlyCreatedId(newInstanceId);
        await refreshAgents();
        setAgentToRedeploy(null);
        setRedeployStepIndex(-1);
        return;
      }

      setRedeployStepIndex(step + 1);
      showSuccessToast(
        'Agent Redeployed',
        `${name} has been redeployed and is now active`,
        { icon: '🚀' }
      );

      setShowRedeployDialog(false);
      closeSlider();
      setNewlyCreatedId(newInstanceId);
      await refreshAgents();
      setAgentToRedeploy(null);
      setRedeployStepIndex(-1);
    } catch (error) {
      setRedeployFailed(true);
      showErrorToast(error, 'Failed to redeploy agent');
      await refreshAgents();
    } finally {
      setIsRedeploying(false);
    }
  }, [currentTenantId, agentToRedeploy, closeSlider, refreshAgents]);

  const handleUndeploy = useCallback(async (selectedDataIds: string[]) => {
    if (!currentTenantId || !agentToUndeploy) return;

    setIsUndeploying(true);
    setUndeployFailed(false);
    setUndeployStepIndex(0);
    try {
      const wasActive = agentToUndeploy.status === 'active';
      let step = 0;

      if (wasActive) {
        setUndeployStepIndex(step);
        const deactivateResponse = await fetch(
          `/api/agent-activations/${agentToUndeploy.id}/deactivate`,
          { method: 'POST' }
        );
        if (!deactivateResponse.ok) {
          const errorData = await deactivateResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message || errorData.error || 'Failed to deactivate agent'
          );
        }
        step += 1;
      }

      setUndeployStepIndex(step);
      const response = await fetch(
        `/api/agent-activations/${agentToUndeploy.id}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409) {
          throw new Error(
            errorData.message ||
              'Cannot undeploy an active agent. Please deactivate it first.'
          );
        }
        throw {
          status: response.status,
          message:
            errorData.message ||
            errorData.error ||
            'Failed to undeploy agent instance',
          error: errorData.error,
          details: errorData.details,
        };
      }

      // Associated-data steps follow deactivate (optional) + undeploy. Unselected
      // categories are skipped without advancing the step index for them. Each
      // category's delete is independent and non-blocking.
      const associatedDataOffset = step + 1;
      let lastStepIndex = step;
      for (let i = 0; i < ASSOCIATED_DATA_DELETE_CONFIG.length; i++) {
        const category = ASSOCIATED_DATA_DELETE_CONFIG[i];
        if (!selectedDataIds.includes(category.id)) continue;

        lastStepIndex = associatedDataOffset + i;
        setUndeployStepIndex(lastStepIndex);
        try {
          const categoryResponse = await fetch(
            category.buildUrl(agentToUndeploy.template, agentToUndeploy.name),
            { method: 'DELETE' }
          );
          if (!categoryResponse.ok) {
            const errorData = await categoryResponse.json().catch(() => ({}));
            showErrorToast(
              new Error(
                errorData.message ||
                  errorData.error ||
                  `Failed to delete ${category.label}`
              ),
              `${category.label} was not fully removed`
            );
          }
        } catch (categoryError) {
          showErrorToast(categoryError, `${category.label} was not fully removed`);
        }
      }

      setUndeployStepIndex(lastStepIndex + 1);
      showSuccessToast(
        `Agent Undeployed Successfully`,
        `${agentToUndeploy.name} has been permanently removed from your workspace`,
        { icon: '🗑️' }
      );

      setShowUndeployDialog(false);
      closeSlider();
      setAgents((prevAgents) =>
        prevAgents.filter((a) => a.id !== agentToUndeploy.id)
      );
      setAgentToUndeploy(null);
      setUndeployStepIndex(-1);
    } catch (error) {
      setUndeployFailed(true);
      showErrorToast(error, 'Failed to undeploy agent instance');
    } finally {
      setIsUndeploying(false);
    }
  }, [currentTenantId, agentToUndeploy, closeSlider, setAgents]);

  const uniqueTemplates = useMemo(
    () => Array.from(new Set(agents.map((a) => a.template))).sort(),
    [agents]
  );

  const filteredAgents = useMemo(
    () =>
      agents.filter((agent) => {
        if (selectedTemplate && agent.template !== selectedTemplate) return false;
        if (showMyAgentsOnly && agent.participantId !== user?.email) return false;
        return true;
      }),
    [agents, selectedTemplate, showMyAgentsOnly, user?.email]
  );

  const activeAgents = useMemo(
    () => filteredAgents.filter((a) => a.status === 'active'),
    [filteredAgents]
  );
  const inactiveAgents = useMemo(
    () => filteredAgents.filter((a) => a.status !== 'active'),
    [filteredAgents]
  );

  const handleClearFilters = useCallback(() => {
    setSelectedTemplate(null);
    setShowMyAgentsOnly(false);
  }, []);

  const handleTemplateSelect = useCallback((template: string) => {
    setSelectedTemplate((prev) => (prev === template ? null : template));
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Agents</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Collaborate with your AI agent coworkers
          </p>
        </div>
        {canAccessSettings && (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/settings/agent-store">
              <Play className="mr-2 h-4 w-4" />
              Activate from Store
            </Link>
          </Button>
        )}
      </div>

      {/* Agent Filter Tags */}
      {!isLoading && agents.length > 0 && uniqueTemplates.length > 0 && (
        <AgentFilters
          agents={agents}
          uniqueTemplates={uniqueTemplates}
          selectedTemplate={selectedTemplate}
          showMyAgentsOnly={showMyAgentsOnly}
          currentUserEmail={user?.email}
          onTemplateSelect={handleTemplateSelect}
          onClearFilters={handleClearFilters}
          onToggleMyAgentsOnly={setShowMyAgentsOnly}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <PageLoader label="Loading agent activations..." />
      )}

      {/* Empty State */}
      {!isLoading && agents.length === 0 && (
        <EmptyState
          icon={Bot}
          title="No activated agents"
          description={
            canAccessSettings
              ? 'You haven\'t activated any agents yet. Click "Activate from Store" to get started.'
              : 'No agents have been activated for your tenant yet. Contact your administrator to activate agents.'
          }
        />
      )}

      {/* Filtered Empty State */}
      {!isLoading && agents.length > 0 && activeAgents.length === 0 && inactiveAgents.length === 0 && (
        <EmptyState
          icon={Bot}
          title="No matching agents"
          description="Try adjusting your filters to see more agents"
          action={{ label: 'Clear Filter', onClick: handleClearFilters }}
        />
      )}

      {/* Active Agents Grid */}
      {!isLoading && (activeAgents.length > 0 || inactiveAgents.length > 0) && (
        <div className="space-y-6">
          {activeAgents.length > 0 && (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeAgents.map((agent) => (
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

          {/* Inactive Agents — collapsible, hidden by default */}
          {inactiveAgents.length > 0 && (
            <div
              className={`overflow-hidden agents-running-inactive-section ${
                showInactiveSection ? 'border border-border rounded-xl' : ''
              }`}
              data-expanded={showInactiveSection}
            >
              <button
                type="button"
                onClick={() => setShowInactiveSection((prev) => !prev)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors ${
                  showInactiveSection ? 'bg-muted/30 hover:bg-muted/50' : 'hover:bg-muted/20'
                }`}
              >
                {showInactiveSection ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">
                  Inactive agents
                </span>
                <Badge variant="secondary" className="text-xs">
                  {inactiveAgents.length}
                </Badge>
              </button>
              {showInactiveSection && (
                <div className="p-4 pt-4 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {inactiveAgents.map((agent) => (
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
            </div>
          )}
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
            onReactivateClick={() => handleReactivateClick(selectedAgent)}
            onRedeployClick={() => handleRedeployClick(selectedAgent)}
            onUndeployClick={() => handleUndeployClick(selectedAgent)}
            canEdit={selectedAgentEditable}
          />
        )}
        {selectedAgent && sliderType === 'configure' && selectedAgentEditable && (
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
        currentStepIndex={deactivateStepIndex}
        hasFailed={deactivateFailed}
        onOpenChange={(open) => {
          if (!open && !isDeactivating) {
            setDeactivateStepIndex(-1);
            setDeactivateFailed(false);
          }
          setShowDeactivateDialog(open);
        }}
        onConfirm={handleDeactivate}
      />

      {/* Reactivate Confirmation Dialog */}
      <AgentReactivateDialog
        open={showReactivateDialog}
        agent={agentToReactivate}
        isReactivating={isReactivating}
        currentStepIndex={reactivateStepIndex}
        hasFailed={reactivateFailed}
        onOpenChange={(open) => {
          if (!open && !isReactivating) {
            setReactivateStepIndex(-1);
            setReactivateFailed(false);
          }
          setShowReactivateDialog(open);
        }}
        onConfirm={handleReactivate}
      />

      {/* Redeploy Confirmation Dialog */}
      <AgentRedeployDialog
        open={showRedeployDialog}
        agent={agentToRedeploy}
        isRedeploying={isRedeploying}
        currentStepIndex={redeployStepIndex}
        hasFailed={redeployFailed}
        onOpenChange={(open) => {
          if (!open && !isRedeploying) {
            setRedeployStepIndex(-1);
            setRedeployFailed(false);
          }
          setShowRedeployDialog(open);
        }}
        onConfirm={handleRedeploy}
      />

      {/* Undeploy Confirmation Dialog */}
      <AgentUndeployDialog
        open={showUndeployDialog}
        agent={agentToUndeploy}
        isUndeploying={isUndeploying}
        currentStepIndex={undeployStepIndex}
        hasFailed={undeployFailed}
        onOpenChange={(open) => {
          if (!open && !isUndeploying) {
            setUndeployStepIndex(-1);
            setUndeployFailed(false);
          }
          setShowUndeployDialog(open);
        }}
        onConfirm={handleUndeploy}
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
    <Suspense fallback={<PageLoader label="Loading agents..." />}>
      <AgentsPageContent />
    </Suspense>
  );
}
