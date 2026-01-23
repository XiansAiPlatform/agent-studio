'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Bot } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
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
import { ActivationConfigWizard, ActivationWizardData, InstanceMetadata } from '@/components/features/agents/activation-config-wizard';

export default function AgentTemplatesPage() {
  const { currentTenantId } = useTenant();
  const { data: session } = useSession();
  
  // Use custom hooks for data fetching
  const { deployedAgents, isLoading, error } = useAgentDeployments(currentTenantId);
  const { 
    availableTemplates, 
    isLoadingTemplates, 
    templatesLoaded, 
    fetchTemplates 
  } = useAgentTemplates(deployedAgents);

  // UI State
  const [selectedTemplate, setSelectedTemplate] = useState<EnhancedTemplate | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<EnhancedDeployment | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTemplateId, setDeployingTemplateId] = useState<string | null>(null);
  const [newlyDeployedId, setNewlyDeployedId] = useState<string | null>(null);
  const [isDeletingAgent, setIsDeletingAgent] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<EnhancedDeployment | null>(null);
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [isStoreSliderOpen, setIsStoreSliderOpen] = useState(false);
  const [mainGridExpanded, setMainGridExpanded] = useState(false);
  const [sliderExpanded, setSliderExpanded] = useState(false);
  
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
    setSelectedTemplate(null);
    
    // Load the configuration wizard first
    setIsLoadingWizard(true);
    setShowConfigWizard(true);
    
    try {
      // Fetch agent deployment details to get workflows
      const response = await fetch(
        `/api/tenants/${currentTenantId}/agents/${encodeURIComponent(deployment.name)}`
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
      
      // Pre-populate instance name and description
      const suggestedName = generateInstanceName(deployment.name);
      setInitialMetadata({
        name: suggestedName,
        description: generateInstanceDescription(deployment.name, suggestedName, session?.user?.name),
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
        body: JSON.stringify({
          tenantId: currentTenantId,
        }),
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
        `/api/tenants/${currentTenantId}/agent-deployments/${encodeURIComponent(agentToDelete.name)}`,
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
        `/api/tenants/${currentTenantId}/agent-activations`,
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
        `/api/tenants/${currentTenantId}/agent-activations/${newInstanceId}/activate`,
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
        description: generateInstanceDescription(selectedDeployment.name, newName, session?.user?.name),
      };
    }
    return { name: '', description: '' };
  };

  const handleOpenStore = () => {
    setIsStoreSliderOpen(true);
    fetchTemplates();
  };

  const handleStartNewRun = async (deployment: EnhancedDeployment) => {
    // Use the same handler as clicking the card
    await handleDeploymentClick(deployment);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          
          <h1 className="text-3xl font-semibold text-foreground">Available Agents</h1>
          <p className="text-muted-foreground mt-1">
            Manage your agents and add new ones from the store
            <Badge variant="secondary" className="ml-5">
                {deployedAgents.length}
            </Badge>
          </p>
        </div>
        <Button variant="outline" className="transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/50" asChild>
          <Link href="/agents/running">
            View Running Agents
          </Link>
        </Button>
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
          {/* Section: Available Agents (Deployed) */}
          <section className="space-y-4">
            

            {deployedAgents.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                  <CardTitle className="text-lg mb-2">No Agents Added</CardTitle>
                  <CardDescription className="text-center">
                    Add your first agent from the store below to get started
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {deployedAgents.map((deployment) => (
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
                
                {/* Add from Store Placeholder Card */}
                <AddFromStoreCard
                  templatesLoaded={templatesLoaded}
                  availableTemplatesCount={availableTemplates.length}
                  onClick={handleOpenStore}
                />
              </div>
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
