'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Play, FileText, Zap, MessageSquare, Database, Code, Sparkles, Loader2, CheckCircle2, Plus, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { XiansAgentTemplate, XiansAgentDeployment } from '@/lib/xians/types';
import { useTenant } from '@/hooks/use-tenant';
import { showErrorToast, showSuccessToast, handleApiError } from '@/lib/utils/error-handler';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

// Icon mapping based on agent name/summary/description
const getAgentIcon = (name: string, summary?: string | null, description?: string | null) => {
  const text = `${name} ${summary || description || ''}`.toLowerCase();
  
  if (text.includes('chat') || text.includes('conversational') || text.includes('support')) {
    return MessageSquare;
  }
  if (text.includes('data') || text.includes('analytics') || text.includes('research')) {
    return Database;
  }
  if (text.includes('marketing') || text.includes('email')) {
    return Sparkles;
  }
  if (text.includes('code') || text.includes('development')) {
    return Code;
  }
  if (text.includes('content') || text.includes('writer')) {
    return FileText;
  }
  if (text.includes('automation') || text.includes('workflow') || text.includes('process')) {
    return Zap;
  }
  return Bot;
};

// Color mapping based on agent type
const getAgentColor = (name: string) => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['primary', 'secondary', 'accent'];
  return colors[hash % colors.length];
};

// Generate a suggested instance name
const generateInstanceName = (agentName: string) => {
  const randomName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: ' ',
    style: 'capital',
  });
  return `${agentName} - ${randomName}`;
};

// Generate a default description with metadata
const generateInstanceDescription = (agentName: string, instanceName: string, userName?: string | null) => {
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const time = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
  const creator = userName || 'user';
  
  return `Created on ${date} at ${time} by ${creator} using the Agent Template '${agentName}'`;
};

type EnhancedDeployment = XiansAgentDeployment & {
  icon?: any;
  color?: string;
  activationCount?: number;
};

type EnhancedTemplate = XiansAgentTemplate & {
  icon?: any;
  color?: string;
  workflowCount?: number;
};

export default function AgentTemplatesPage() {
  const { currentTenantId } = useTenant();
  const { data: session } = useSession();
  const [deployedAgents, setDeployedAgents] = useState<EnhancedDeployment[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<EnhancedTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EnhancedTemplate | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<EnhancedDeployment | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTemplateId, setDeployingTemplateId] = useState<string | null>(null);
  const [newlyDeployedId, setNewlyDeployedId] = useState<string | null>(null);
  const [isDeletingAgent, setIsDeletingAgent] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<EnhancedDeployment | null>(null);
  const [instanceName, setInstanceName] = useState('');
  const [instanceDescription, setInstanceDescription] = useState('');
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);

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

  // Fetch deployed agents and templates on mount
  useEffect(() => {
    async function fetchData() {
      if (!currentTenantId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch both deployed agents and available templates in parallel
        const [deploymentsRes, templatesRes] = await Promise.all([
          fetch(`/api/tenants/${currentTenantId}/agent-deployments`),
          fetch('/api/agents/templates')
        ]);
        
        const deploymentsData = await deploymentsRes.json();
        const templatesData = await templatesRes.json();
        
        // Check for error responses
        if (!deploymentsRes.ok) {
          console.error('Failed to fetch deployments:', deploymentsData);
          throw new Error(deploymentsData.message || 'Failed to fetch deployments');
        }
        
        if (!templatesRes.ok) {
          console.error('Failed to fetch templates:', templatesData);
          throw new Error(templatesData.message || 'Failed to fetch templates');
        }
        
        // Handle potential error responses or ensure we have arrays
        // The deployments response has structure: { agents: [...], pagination: {...} }
        // The templates response is a direct array
        const deployments: XiansAgentDeployment[] = Array.isArray(deploymentsData?.agents) 
          ? deploymentsData.agents 
          : Array.isArray(deploymentsData) 
          ? deploymentsData
          : [];
          
        const allTemplates: XiansAgentTemplate[] = Array.isArray(templatesData) 
          ? templatesData 
          : Array.isArray(templatesData?.data)
          ? templatesData.data
          : [];
        
        console.log('Processed deployments:', deployments);
        console.log('Processed templates:', allTemplates);
        
        // Get deployed agent names (case-insensitive for comparison)
        const deployedAgentNames = new Set(
          deployments.map(d => d.name.toLowerCase().trim())
        );
        
        console.log('Deployed agent names:', Array.from(deployedAgentNames));
        console.log('Template agent names:', allTemplates.map(t => t.agent.name));
        
        // Filter templates to only show ones not yet deployed (by name comparison)
        const undeployedTemplates = allTemplates.filter(
          template => !deployedAgentNames.has(template.agent.name.toLowerCase().trim())
        );
        
        // Enhance deployments with UI metadata
        const enhancedDeployments: EnhancedDeployment[] = deployments.map(deployment => ({
          ...deployment,
          icon: getAgentIcon(deployment.name, null, deployment.description),
          color: getAgentColor(deployment.name),
          activationCount: 0, // TODO: Fetch actual activation count from API
        }));
        
        // Sort deployments by creation date (newest first)
        enhancedDeployments.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        
        // Enhance templates with UI metadata
        const enhancedTemplates: EnhancedTemplate[] = undeployedTemplates.map(template => ({
          ...template,
          icon: getAgentIcon(template.agent.name, template.agent.summary, template.agent.description),
          color: getAgentColor(template.agent.name),
          workflowCount: template.definitions.length,
        }));
        
        setDeployedAgents(enhancedDeployments);
        setAvailableTemplates(enhancedTemplates);
      } catch (err) {
        // Error is already logged in showErrorToast, no need to log again
        const errorMessage = err instanceof Error ? err.message : 'Failed to load agents';
        setError(errorMessage);
        showErrorToast(err, 'Failed to load agents and templates');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [currentTenantId]);

  const handleDeploymentClick = (deployment: EnhancedDeployment) => {
    setSelectedDeployment(deployment);
    setSelectedTemplate(null);
    // Pre-populate instance form with suggested name and description
    const suggestedName = generateInstanceName(deployment.name);
    setInstanceName(suggestedName);
    setInstanceDescription(generateInstanceDescription(deployment.name, suggestedName, session?.user?.name));
    setIsDetailsOpen(true);
  };

  const handleTemplateClick = (template: EnhancedTemplate) => {
    setSelectedTemplate(template);
    setSelectedDeployment(null);
    setIsDetailsOpen(true);
  };

  const handleDeployClick = async (template: EnhancedTemplate, event?: React.MouseEvent) => {
    // Prevent card click event from firing
    event?.stopPropagation();
    
    if (!currentTenantId) return;
    
    try {
      setDeployingTemplateId(template.agent.id);
      
      console.log('Deploying template:', template.agent.id, 'to tenant:', currentTenantId);
      
      const response = await fetch(`/api/agents/templates/${template.agent.id}/deploy`, {
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
        // Extract error message from server response
        const errorMessage = errorData.error || errorData.message || 'Failed to deploy agent';
        // Create error with status code attached
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
      
      // Close the details sheet if open
      setIsDetailsOpen(false);
      
      // Redirect with the newly deployed agent ID to highlight it
      // The result should contain the deployed agent's ID
      const deployedAgentId = result.id || result.agentId || template.agent.id;
      window.location.href = `/agents/templates?newAgent=${deployedAgentId}`;
    } catch (err) {
      // DON'T set global error state - just show toast
      // Global error state is only for initial page load failures
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
        // Extract error message from server response
        const errorMessage = errorData.error || errorData.message || 'Failed to delete agent';
        // Create error with status code attached
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
      
      // Close both dialogs
      setShowDeleteDialog(false);
      setIsDetailsOpen(false);
      
      // Refresh the page to show updated list
      window.location.reload();
    } catch (err) {
      // DON'T set global error state - just show toast
      // Global error state is only for initial page load failures
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

  const handleCreateInstance = async () => {
    if (!currentTenantId || !selectedDeployment) return;
    
    // Validate inputs
    const trimmedName = instanceName.trim();
    if (!trimmedName) {
      showErrorToast(new Error('Please provide an instance name'));
      return;
    }
    
    // Validate name format (alphanumeric, spaces, hyphens, underscores only)
    const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!nameRegex.test(trimmedName)) {
      showErrorToast(new Error('Instance name can only contain letters, numbers, spaces, hyphens, and underscores'));
      return;
    }
    
    // Validate name length
    if (trimmedName.length < 3) {
      showErrorToast(new Error('Instance name must be at least 3 characters long'));
      return;
    }
    
    if (trimmedName.length > 100) {
      showErrorToast(new Error('Instance name must be less than 100 characters'));
      return;
    }
    
    try {
      setIsCreatingInstance(true);
      
      console.log('Creating activation for agent:', selectedDeployment.name, 'with name:', trimmedName);
      
      // Create an agent activation (instance)
      const response = await fetch(
        `/api/tenants/${currentTenantId}/agent-activations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: trimmedName,
            agentName: selectedDeployment.name, // The deployed agent's name
            description: instanceDescription.trim() || undefined,
            participantId: session?.user?.email || session?.user?.id, // User email (fallback to ID)
            // workflowConfiguration can be added here if needed
          }),
        }
      );
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('The API endpoint returned an invalid response. Please ensure the activations API is properly configured.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        const errorMessage = result.message || result.error || 'Failed to create instance';
        const error: any = new Error(errorMessage);
        error.status = response.status;
        error.code = result.code;
        throw error;
      }
      
      console.log('Instance created successfully:', result);
      
      // Show success notification
      showSuccessToast(
        'Instance Created Successfully',
        `${trimmedName} is now ready to use in your workspace`,
        { icon: '✨' }
      );
      
      // Reset form
      setInstanceName('');
      setInstanceDescription('');
      
      // Close the sheet
      setIsDetailsOpen(false);
      
      // Redirect to agents page with the new instance ID highlighted
      const newInstanceId = result.id || result.activationId;
      window.location.href = `/agents?newInstance=${newInstanceId}`;
    } catch (err) {
      showErrorToast(err);
    } finally {
      setIsCreatingInstance(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Agent Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage your deployed agents and add new ones from the store
          </p>
        </div>
        <Button variant="outline" className="transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/50" asChild>
          <Link href="/agents">
            View Agent Instances
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
          {/* Section 1: Available Agents (Deployed) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Available to Use</h2>
              <Badge variant="secondary" className="ml-2">
                {deployedAgents.length}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Agents currently deployed in your tenant
            </p>

            {deployedAgents.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                  <CardTitle className="text-lg mb-2">No Deployed Agents</CardTitle>
                  <CardDescription className="text-center">
                    Deploy your first agent from the store below to get started
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {deployedAgents.map((deployment) => {
                  const Icon = deployment.icon || Bot;
                  const isNewlyDeployed = newlyDeployedId === deployment.id;

                  return (
                    <Card 
                      key={deployment.id} 
                      className={`group hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer ${
                        isNewlyDeployed 
                          ? 'ring-2 ring-green-500 ring-offset-2 shadow-xl shadow-green-500/30 bg-green-50 dark:bg-green-950/20 border-green-500' 
                          : ''
                      }`}
                      onClick={() => handleDeploymentClick(deployment)}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center ring-1 ring-green-500/10 flex-shrink-0">
                            <Icon className="h-7 w-7 text-green-600" />
                          </div>
                          <div className="flex flex-col gap-1.5 items-end">
                            {isNewlyDeployed && (
                              <Badge 
                                variant="default" 
                                className="text-xs font-semibold bg-green-600 hover:bg-green-600 animate-pulse"
                              >
                                NEW
                              </Badge>
                            )}
                            <Badge 
                              variant={deployment.status === 'active' ? 'default' : 'secondary'} 
                              className="text-xs font-medium"
                            >
                              {deployment.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors">
                            {deployment.name}
                          </CardTitle>
                          {deployment.description && (
                            <CardDescription className="text-sm leading-relaxed line-clamp-2">
                              {deployment.description}
                            </CardDescription>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Deployed</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 2: Add from Store */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Add from Store</h2>
              <Badge variant="secondary" className="ml-2">
                {availableTemplates.length}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Deploy new agents from available templates
            </p>

            {availableTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                  <CardTitle className="text-lg mb-2">All Agents Deployed</CardTitle>
                  <CardDescription className="text-center">
                    You&apos;ve deployed all available agent templates
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {availableTemplates.map((template) => {
                  const Icon = template.icon || Bot;

                  return (
                    <Card 
                      key={template.agent.id} 
                      className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer"
                      onClick={() => handleTemplateClick(template)}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center ring-1 ring-primary/10 flex-shrink-0">
                            <Icon className="h-7 w-7 text-primary" />
                          </div>
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {template.agent.version && (
                              <Badge variant="outline" className="text-xs font-medium border-primary/20 text-primary">
                                v{template.agent.version}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors">
                            {template.agent.name}
                          </CardTitle>
                          {(template.agent.summary || template.agent.description) && (
                            <CardDescription className="text-sm leading-relaxed line-clamp-2">
                              {template.agent.summary || template.agent.description}
                            </CardDescription>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Zap className="h-4 w-4" />
                          <span>{template.workflowCount} workflow{template.workflowCount !== 1 ? 's' : ''}</span>
                        </div>
                        {template.agent.author && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>By {template.agent.author}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Agent Details Sheet - for both deployments and templates */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {selectedDeployment && (
            <>
              <SheetHeader className="px-6 pt-6">
                <SheetTitle className="flex items-center gap-2">
                  {selectedDeployment.icon && (
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center ring-1 ring-green-500/10">
                      <selectedDeployment.icon className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                  <span>{selectedDeployment.name}</span>
                  <Badge variant={selectedDeployment.status === 'active' ? 'default' : 'secondary'}>
                    {selectedDeployment.status}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {selectedDeployment.description || 'Deployed agent details'}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-6 py-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 p-3 rounded-lg bg-muted/50 border">
                      <div className="text-xs text-muted-foreground">Activations</div>
                      <div className="text-lg font-semibold">{selectedDeployment.activationCount ?? 0}</div>
                    </div>
                    <div className="space-y-1 p-3 rounded-lg bg-muted/50 border">
                      <div className="text-xs text-muted-foreground">Deployed</div>
                      <div className="text-sm font-semibold">
                        {new Date(selectedDeployment.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">This agent is ready to use</span>
                  </div>
                </div>

                {/* Create New Instance Form */}
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <h3 className="text-sm font-semibold text-foreground">Create New Instance</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="instance-name">Instance Name *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="instance-name"
                          placeholder="e.g., Customer Support Bot"
                          value={instanceName}
                          onChange={(e) => setInstanceName(e.target.value)}
                          disabled={isCreatingInstance}
                          maxLength={100}
                          className="flex-1 bg-white dark:bg-white/10"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (selectedDeployment) {
                              const newName = generateInstanceName(selectedDeployment.name);
                              setInstanceName(newName);
                              setInstanceDescription(generateInstanceDescription(selectedDeployment.name, newName, session?.user?.name));
                            }
                          }}
                          disabled={isCreatingInstance}
                          title="Generate new name"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        3-100 characters. Letters, numbers, spaces, hyphens, and underscores only.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instance-description">Description</Label>
                      <Textarea
                        id="instance-description"
                        placeholder="Describe what this instance will be used for (optional)"
                        value={instanceDescription}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInstanceDescription(e.target.value)}
                        disabled={isCreatingInstance}
                        rows={3}
                        maxLength={500}
                        className="bg-white dark:bg-white/10"
                      />
                      <p className="text-xs text-muted-foreground">
                        {instanceDescription.length}/500 characters
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary Action - Create Instance */}
                <Button 
                  className="w-full h-11 font-semibold"
                  onClick={handleCreateInstance}
                  disabled={isCreatingInstance || !instanceName.trim()}
                >
                  {isCreatingInstance ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Instance...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Instance
                    </>
                  )}
                </Button>

                {/* Secondary Action - Delete Agent */}
                <Button 
                  variant="outline"
                  className="w-full h-11 font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteClick(selectedDeployment)}
                  disabled={isCreatingInstance}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Agent
                </Button>
              </div>
            </>
          )}

          {selectedTemplate && (
            <>
              <SheetHeader className="px-6 pt-6">
                <SheetTitle className="flex items-center gap-2">
                  {selectedTemplate.icon && (
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                      <selectedTemplate.icon className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <span>{selectedTemplate.agent.name}</span>
                </SheetTitle>
                <SheetDescription>
                  {selectedTemplate.agent.summary || selectedTemplate.agent.description || 'Agent template details'}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-6 py-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 p-3 rounded-lg bg-muted/50 border">
                      <div className="text-xs text-muted-foreground">Workflows</div>
                      <div className="text-lg font-semibold">{selectedTemplate.workflowCount}</div>
                    </div>
                    {selectedTemplate.agent.author && (
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50 border">
                        <div className="text-xs text-muted-foreground">Author</div>
                        <div className="text-sm font-semibold">{selectedTemplate.agent.author}</div>
                      </div>
                    )}
                    {selectedTemplate.agent.version && (
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50 border">
                        <div className="text-xs text-muted-foreground">Version</div>
                        <div className="text-sm font-semibold">{selectedTemplate.agent.version}</div>
                      </div>
                    )}
                    {selectedTemplate.agent.createdAt && (
                      <div className="space-y-1 p-3 rounded-lg bg-muted/50 border">
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="text-sm font-semibold">
                          {new Date(selectedTemplate.agent.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedTemplate.agent.description && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Description</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedTemplate.agent.description}
                    </p>
                  </div>
                )}

                {selectedTemplate.definitions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Available Workflows ({selectedTemplate.definitions.length})
                    </h3>
                    <ul className="space-y-2">
                      {selectedTemplate.definitions.map((def, idx) => (
                        <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border hover:border-primary/50 transition-colors">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="h-2 w-2 rounded-full bg-primary"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">
                              {def.name || def.workflowType.split(':')[1]}
                            </div>
                            {def.parameterDefinitions.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {def.parameterDefinitions.length} parameter{def.parameterDefinitions.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button 
                  className="w-full h-11 font-semibold"
                  onClick={() => handleDeployClick(selectedTemplate)}
                  disabled={deployingTemplateId === selectedTemplate.agent.id}
                >
                  {deployingTemplateId === selectedTemplate.agent.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Deploy to this Tenant
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <DialogTitle>Delete Agent</DialogTitle>
                <DialogDescription className="mt-1">
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
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
            </div>
            
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={isDeletingAgent}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeletingAgent}
            >
              {isDeletingAgent ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Agent
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
