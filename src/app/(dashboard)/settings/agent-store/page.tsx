'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Bot } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { useCan } from '@/hooks/use-permissions';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';

// Local imports
import { EnhancedDeployment, EnhancedTemplate } from './types';
import { useAgentDeployments } from './hooks/use-agent-deployments';
import { useAgentTemplates } from './hooks/use-agent-templates';
import { 
  generateInstanceName, 
  generateInstanceDescription 
} from './utils/agent-helpers';
import { DeployedAgentCard } from './components/deployed-agent-card';
import { AddFromStoreCard } from './components/add-from-store-card';
import { StoreSliderSheet } from './components/store-slider-sheet';
import { DeleteAgentDialog } from './components/delete-agent-dialog';
import { PromoteToTemplateDialog } from './components/promote-to-template-dialog';
import { CategoryFilter } from './components/category-filter';
import { getCategoryLabel, groupByCategory, getUniqueCategories } from './utils/category-utils';
import { ActivationConfigWizard, ActivationWizardData, InstanceMetadata } from '@/components/features/agents/activation-config-wizard';

export default function AgentTemplatesPage() {
  const { currentTenantId } = useTenant();
  const { data: session } = useSession();
  // Only system admins can import/browse the global template store.
  const canImportTemplates = useCan('system:admin');
  
  // Use custom hooks for data fetching
  const { deployedAgents, isLoading, error } = useAgentDeployments();
  const { 
    availableTemplates, 
    isLoadingTemplates, 
    templatesLoaded, 
    fetchTemplates 
  } = useAgentTemplates(deployedAgents);

  // UI State
  const [selectedDeployment, setSelectedDeployment] = useState<EnhancedDeployment | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTemplateId, setDeployingTemplateId] = useState<string | null>(null);
  const [newlyDeployedId, setNewlyDeployedId] = useState<string | null>(null);
  const [isDeletingAgent, setIsDeletingAgent] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<EnhancedDeployment | null>(null);
  const [isPromotingAgent, setIsPromotingAgent] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [agentToPromote, setAgentToPromote] = useState<EnhancedDeployment | null>(null);
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [isStoreSliderOpen, setIsStoreSliderOpen] = useState(false);
  const [mainGridExpanded, setMainGridExpanded] = useState(false);
  const [sliderExpanded, setSliderExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Configuration wizard state
  const [showConfigWizard, setShowConfigWizard] = useState(false);
  const [wizardData, setWizardData] = useState<ActivationWizardData | null>(null);
  const [isLoadingWizard, setIsLoadingWizard] = useState(false);
  const [initialMetadata, setInitialMetadata] = useState<InstanceMetadata>({ name: '', description: '' });

  // Check for newly deployed agent from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const newAgentId = params.get('newAgent');
      if (newAgentId) {
        setNewlyDeployedId(newAgentId);
        
        // Remove the highlight after 10 seconds
        const timer = setTimeout(() => {
          setNewlyDeployedId(null);
        }, 10000);
        
        // Clean URL without reloading
        window.history.replaceState({}, '', window.location.pathname);
        
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDeploymentClick = async (deployment: EnhancedDeployment) => {
    if (!currentTenantId) return;
    
    setSelectedDeployment(deployment);
    
    // Load the configuration wizard first
    setIsLoadingWizard(true);
    setShowConfigWizard(true);
    
    try {
      // Fetch agent deployment details to get workflows
      const response = await fetch(
        `/api/agents/${encodeURIComponent(deployment.name)}`
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
          summary: data.agent.summary,
        },
        workflows: workflowsWithParams,
      });
      
      // Pre-populate instance name and description (use agent's summary when available)
      const suggestedName = generateInstanceName(deployment.name);
      setInitialMetadata({
        name: suggestedName,
        description: data.agent?.summary?.trim() || generateInstanceDescription(deployment.name, suggestedName, session?.user?.name),
      });
    } catch (err) {
      showErrorToast(err, 'Failed to load configuration wizard');
      setShowConfigWizard(false);
    } finally {
      setIsLoadingWizard(false);
    }
  };

  const handleTemplateClick = (template: EnhancedTemplate) => {
    // Templates don't need configuration, just deploy directly
    handleDeployClick(template);
  };

  const handleDeployClick = async (template: EnhancedTemplate, event?: React.MouseEvent) => {
    // Prevent card click event from firing
    event?.stopPropagation();
    
    if (!currentTenantId) return;
    
    try {
      setDeployingTemplateId(template.agent.id);
      
      console.log('Deploying template:', template.agent.id, 'to tenant:', currentTenantId);
      
      const response = await fetch(`/api/agents/store/${template.agent.id}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.message || 'Failed to deploy agent';
        const error: any = new Error(errorMessage);
        error.status = response.status;
        error.code = errorData.code;
        throw error;
      }
      
      const result = await response.json();
      console.log('Deployment successful:', result);
      
      // Show success notification
      showSuccessToast(
        'Agent Deployed Successfully',
        `${template.agent.name} is now active and ready to use`,
        { icon: '🚀' }
      );
      
      // Redirect with the newly deployed agent ID to highlight it
      const deployedAgentId = result.id || result.agentId || template.agent.id;
      window.location.href = `/settings/agent-store?newAgent=${deployedAgentId}`;
    } catch (err) {
      showErrorToast(err);
    } finally {
      setDeployingTemplateId(null);
    }
  };

  const handleDeleteClick = (deployment: EnhancedDeployment) => {
    setAgentToDelete(deployment);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!currentTenantId || !agentToDelete) return;
    
    try {
      setIsDeletingAgent(true);
      
      console.log('Deleting agent:', agentToDelete.name, 'from tenant:', currentTenantId);
      
      const response = await fetch(
        `/api/agent-deployments/${encodeURIComponent(agentToDelete.name)}`,
        {
          method: 'DELETE',
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.message || 'Failed to delete agent';
        const error: any = new Error(errorMessage);
        error.status = response.status;
        error.code = errorData.code;
        throw error;
      }
      
      console.log('Agent deleted successfully');
      
      // Show success notification
      showSuccessToast(
        'Agent Deleted Successfully',
        `${agentToDelete.name} has been removed from your workspace`,
        { icon: '🗑️' }
      );
      
      // Close dialog
      setShowDeleteDialog(false);
      
      // Refresh the page to show updated list
      window.location.reload();
    } catch (err) {
      showErrorToast(err);
      setShowDeleteDialog(false);
    } finally {
      setIsDeletingAgent(false);
      setAgentToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setAgentToDelete(null);
  };

  const handlePromoteClick = (deployment: EnhancedDeployment) => {
    setAgentToPromote(deployment);
    setShowPromoteDialog(true);
  };

  const handleConfirmPromote = async () => {
    if (!agentToPromote) return;

    try {
      setIsPromotingAgent(true);

      const response = await fetch(
        `/api/agent-deployments/${encodeURIComponent(agentToPromote.name)}/promote-to-template`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.message || 'Failed to convert agent to a template';
        const error: any = new Error(errorMessage);
        error.status = response.status;
        error.code = errorData.code;
        throw error;
      }

      showSuccessToast(
        'Converted to Template',
        `${agentToPromote.name} is now available as a template for any tenant to import`,
        { icon: '📦' }
      );

      setShowPromoteDialog(false);
    } catch (err) {
      showErrorToast(err);
      setShowPromoteDialog(false);
    } finally {
      setIsPromotingAgent(false);
      setAgentToPromote(null);
    }
  };

  const handleCancelPromote = () => {
    setShowPromoteDialog(false);
    setAgentToPromote(null);
  };

  const toggleMainGridExpanded = () => {
    setMainGridExpanded(prev => !prev);
  };

  const toggleSliderExpanded = () => {
    setSliderExpanded(prev => !prev);
  };


  const handleConfigWizardComplete = async (
    inputs: Record<string, Record<string, string>>, 
    metadata?: InstanceMetadata
  ) => {
    if (!currentTenantId || !selectedDeployment || !metadata) return;
    
    try {
      setIsCreatingInstance(true);
      
      console.log('Creating activation for agent:', selectedDeployment.name, 'with name:', metadata.name);
      
      // Build workflow configuration from the wizard inputs
      const workflows = wizardData?.workflows.map((workflow) => {
        const workflowInputs = inputs[workflow.workflowType] || {};
        const validParamNames = new Set(
          workflow.parameterDefinitions.map((param) => param.name)
        );
        
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
      }) || [];
      
      // Step 1: Create an agent activation (instance) with workflow configuration
      const createResponse = await fetch(
        `/api/agent-activations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: metadata.name.trim(),
            agentName: selectedDeployment.name,
            description: metadata.description.trim() || undefined,
            workflowConfiguration: workflows.length > 0 ? {
              workflows,
            } : undefined,
          }),
        }
      );
      
      // Check if response is JSON
      const contentType = createResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('The API endpoint returned an invalid response. Please ensure the activations API is properly configured.');
      }
      
      const createResult = await createResponse.json();
      
      if (!createResponse.ok) {
        const errorMessage = createResult.message || createResult.error || 'Failed to create instance';
        const error: any = new Error(errorMessage);
        error.status = createResponse.status;
        error.code = createResult.code;
        throw error;
      }
      
      console.log('Instance created successfully:', createResult);
      
      const newInstanceId = createResult.id || createResult.activationId;
      
      // Step 2: Activate the newly created instance
      console.log('Activating instance:', newInstanceId);
      
      const activateResponse = await fetch(
        `/api/agent-activations/${newInstanceId}/activate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflowConfiguration: workflows.length > 0 ? {
              workflows,
            } : undefined,
          }),
        }
      );
      
      if (!activateResponse.ok) {
        const activateError = await activateResponse.json().catch(() => ({}));
        // Instance created but activation failed - show warning
        showErrorToast(
          new Error(activateError.message || activateError.error || 'Failed to activate instance'),
          'Instance created but activation failed'
        );
        
        // Still redirect to show the created instance
        window.location.href = `/agents/running?newInstance=${newInstanceId}`;
        return;
      }
      
      console.log('Instance activated successfully');
      
      // Show success notification
      showSuccessToast(
        'Agent Run Started Successfully',
        `${metadata.name} is now active and running`,
        { icon: '🚀' }
      );
      
      // Reset state
      setShowConfigWizard(false);
      setWizardData(null);
      setSelectedDeployment(null);
      
      // Redirect to agents page with the new instance ID highlighted
      window.location.href = `/agents/running?newInstance=${newInstanceId}`;
    } catch (err) {
      showErrorToast(err);
    } finally {
      setIsCreatingInstance(false);
    }
  };

  const handleConfigWizardCancel = () => {
    setShowConfigWizard(false);
    setWizardData(null);
    setSelectedDeployment(null);
  };

  const handleGenerateInstanceName = (): InstanceMetadata => {
    if (selectedDeployment) {
      const newName = generateInstanceName(selectedDeployment.name);
      return {
        name: newName,
        description: wizardData?.agent?.summary?.trim() || generateInstanceDescription(selectedDeployment.name, newName, session?.user?.name),
      };
    }
    return { name: '', description: '' };
  };

  const handleOpenStore = () => {
    setIsStoreSliderOpen(true);
    fetchTemplates();
  };

  // Category filter for deployed agents
  const categories = useMemo(
    () => getUniqueCategories(deployedAgents, (d) => d.category),
    [deployedAgents]
  );
  const filteredDeployments = useMemo(() => {
    if (selectedCategory === null) return deployedAgents;
    return deployedAgents.filter(
      (d) => getCategoryLabel(d.category) === selectedCategory
    );
  }, [deployedAgents, selectedCategory]);
  const groupedByCategory = useMemo(
    () => groupByCategory(filteredDeployments, (d) => d.category),
    [filteredDeployments]
  );
  const countByCategory = useMemo(() => {
    const byCategory = groupByCategory(deployedAgents, (d) => d.category);
    return Object.fromEntries([...byCategory.entries()].map(([k, v]) => [k, v.length]));
  }, [deployedAgents]);

  const handleStartNewRun = async (deployment: EnhancedDeployment) => {
    // Use the same handler as clicking the card
    await handleDeploymentClick(deployment);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Agent Store</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage and add new agents to your organization from the store
            <Badge variant="secondary" className="ml-2 sm:ml-5">
                {deployedAgents.length}
            </Badge>
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap md:shrink-0">
          {canImportTemplates && (
            <Button variant="outline" onClick={handleOpenStore} className="flex-1 md:flex-initial">
              Import Template
            </Button>
          )}
          <Button variant="outline" asChild className="flex-1 md:flex-initial">
            <Link href="/agents/running">
              <span className="md:hidden">Activated</span>
              <span className="hidden md:inline">View Activated Agents</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading agents...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Agents</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Available Agents */}
          <section className="space-y-6">
            {deployedAgents.length === 0 ? (
              canImportTemplates ? (
                // System admin: Show Browse Agent Templates card
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm p-6">
                  <AddFromStoreCard
                    templatesLoaded={templatesLoaded}
                    availableTemplatesCount={availableTemplates.length}
                    onClick={handleOpenStore}
                    prominent
                  />
                </div>
              ) : (
                // Non-admin: Show empty state message
                <div className="text-center py-16">
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                        <Bot className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-foreground">No agents added yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Contact your system administrator to add agents to your organization
                      </p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <>
                {/* Category Filter */}
                {categories.length > 0 && (
                  <div className="mb-4">
                    <CategoryFilter
                      categories={categories}
                      selectedCategory={selectedCategory}
                      onSelect={setSelectedCategory}
                      countByCategory={countByCategory}
                    />
                  </div>
                )}

                {/* Agent grid */}
                <div className="space-y-8">
                  {selectedCategory === null ? (
                    [...groupedByCategory.entries()].map(([categoryLabel, categoryDeployments]) => (
                      <section key={categoryLabel} className="space-y-4">
                        {categoryLabel && (
                          <h3 className="text-base font-semibold text-foreground">
                            {categoryLabel}
                            <span className="ml-2 font-medium text-muted-foreground">
                              ({categoryDeployments.length})
                            </span>
                          </h3>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryDeployments.map((deployment) => (
                            <DeployedAgentCard
                              key={deployment.id}
                              deployment={deployment}
                              isNewlyDeployed={newlyDeployedId === deployment.id}
                              isExpanded={mainGridExpanded}
                              onToggleExpanded={toggleMainGridExpanded}
                              onClick={() => handleDeploymentClick(deployment)}
                              onStartNewRun={() => handleStartNewRun(deployment)}
                              onDelete={() => handleDeleteClick(deployment)}
                              canPromoteToTemplate={canImportTemplates}
                              onPromoteToTemplate={() => handlePromoteClick(deployment)}
                            />
                          ))}
                        </div>
                      </section>
                    ))
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredDeployments.map((deployment) => (
                        <DeployedAgentCard
                          key={deployment.id}
                          deployment={deployment}
                          isNewlyDeployed={newlyDeployedId === deployment.id}
                          isExpanded={mainGridExpanded}
                          onToggleExpanded={toggleMainGridExpanded}
                          onClick={() => handleDeploymentClick(deployment)}
                          onStartNewRun={() => handleStartNewRun(deployment)}
                          onDelete={() => handleDeleteClick(deployment)}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Add from Store - Only for System Admins */}
                {canImportTemplates && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Add more</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AddFromStoreCard
                        templatesLoaded={templatesLoaded}
                        availableTemplatesCount={availableTemplates.length}
                        onClick={handleOpenStore}
                      />
                    </div>
                  </section>
                )}
              </>
            )}
          </section>
        </>
      )}

      {/* Store Slider Panel */}
      <StoreSliderSheet
        open={isStoreSliderOpen}
        onOpenChange={(open) => {
          setIsStoreSliderOpen(open);
          if (!open) {
            setSliderExpanded(false);
          }
        }}
        templates={availableTemplates}
        isLoading={isLoadingTemplates}
        deployingTemplateId={deployingTemplateId}
        allExpanded={sliderExpanded}
        onToggleExpanded={toggleSliderExpanded}
        onDeploy={handleDeployClick}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteAgentDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        agent={agentToDelete}
        isDeleting={isDeletingAgent}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* Convert to Template Confirmation Dialog */}
      <PromoteToTemplateDialog
        open={showPromoteDialog}
        onOpenChange={setShowPromoteDialog}
        agent={agentToPromote}
        isPromoting={isPromotingAgent}
        onConfirm={handleConfirmPromote}
        onCancel={handleCancelPromote}
      />

      {/* Configuration Wizard with Instance Metadata */}
      <ActivationConfigWizard
        open={showConfigWizard}
        onOpenChange={setShowConfigWizard}
        wizardData={wizardData}
        isLoading={isLoadingWizard}
        onComplete={handleConfigWizardComplete}
        onCancel={handleConfigWizardCancel}
        includeMetadataStep={true}
        initialMetadata={initialMetadata}
        onGenerateInstanceName={handleGenerateInstanceName}
        isSubmitting={isCreatingInstance}
      />
    </div>
  );
}
