import { useState, useEffect } from 'react';
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Activity, CheckCircle, AlertCircle, Info, Loader2, Pencil, Settings2 } from 'lucide-react';
import { Agent } from '../types';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import { Badge } from '@/components/ui/badge';

interface ConfigurePanelProps {
  agent: Agent;
  tenantId: string | null;
  onDeactivate: () => void;
}

export function ConfigurePanel({ agent, tenantId, onDeactivate }: ConfigurePanelProps) {
  const [workflowConfig, setWorkflowConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [description, setDescription] = useState(agent.description);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  useEffect(() => {
    const fetchConfiguration = async () => {
      if (!tenantId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/tenants/${tenantId}/agent-activations`);
        if (response.ok) {
          const activations = await response.json();
          const currentActivation = Array.isArray(activations)
            ? activations.find((a: any) => a.id === agent.id)
            : null;
          
          setWorkflowConfig(currentActivation?.workflowConfiguration || null);
          // Update description from API if different
          if (currentActivation?.description) {
            setDescription(currentActivation.description);
          }
        }
      } catch (error) {
        console.error('[ConfigurePanel] Error fetching configuration:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfiguration();
  }, [agent.id, tenantId]);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setHasChanges(value !== agent.description);
  };

  const handleSaveDescription = async () => {
    if (!tenantId || !hasChanges) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/agent-activations/${agent.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: description,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update description');
      }

      // Success - update local state
      agent.description = description;
      setHasChanges(false);
      setIsEditingDescription(false);
      
      showSuccessToast(
        'Description Updated',
        'The agent description has been updated successfully'
      );
      console.log('[ConfigurePanel] Description updated successfully');
    } catch (error) {
      console.error('[ConfigurePanel] Error updating description:', error);
      showErrorToast(error, 'Failed to update description');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDescription(agent.description);
    setHasChanges(false);
    setIsEditingDescription(false);
  };

  return (
    <SheetContent className="flex flex-col p-0">
      <SheetHeader className="px-6 pt-6 pb-4 border-b">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <SheetTitle className="text-lg">Configuration</SheetTitle>
        </div>
        <SheetDescription className="text-sm whitespace-normal break-words mt-1">
          {agent.name}
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading configuration...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
              </div>
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Agent Name</label>
                  <div className="mt-1.5 px-3 py-2.5 text-sm rounded-lg bg-muted/50 border border-border/50">
                    {agent.name}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    {!isEditingDescription && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingDescription(true)}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {isEditingDescription ? (
                    <>
                      <textarea
                        value={description}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border rounded-lg bg-background resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                        rows={3}
                        placeholder="Add a description for this agent..."
                        autoFocus
                      />
                      <div className="flex items-center gap-2 mt-2.5">
                        <Button
                          size="sm"
                          onClick={handleSaveDescription}
                          disabled={isSaving || !hasChanges}
                          className="h-8"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="h-8"
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="px-3 py-2.5 text-sm rounded-lg bg-muted/50 border border-border/50 min-h-[82px]">
                      {description || (
                        <span className="text-muted-foreground italic text-xs">No description provided</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Agent Type</label>
                  <div className="mt-1.5">
                    <Badge variant="outline" className="font-medium bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                      {agent.template}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Workflow Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Workflow Configuration</h3>
              </div>
              {workflowConfig?.workflows && workflowConfig.workflows.length > 0 ? (
                <div className="space-y-3">
                  {workflowConfig.workflows.map((workflow: any, index: number) => (
                    <div
                      key={index}
                      className="rounded-lg border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                        <Badge variant="secondary" className="font-medium text-xs">
                          {workflow.workflowType}
                        </Badge>
                      </div>
                      <div className="p-4">
                        {workflow.inputs && workflow.inputs.length > 0 ? (
                          <div className="space-y-3">
                            {workflow.inputs.map((input: any, inputIndex: number) => (
                              <div key={inputIndex}>
                                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                                  {input.name}
                                </label>
                                <div className="px-3 py-2 text-sm rounded-md bg-muted/40 border border-border/40 font-mono text-foreground/90">
                                  {input.value || <span className="text-muted-foreground italic not-italic font-sans text-xs">Not set</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No inputs configured
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-8 text-center">
                  <Settings2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No workflow configuration found for this agent
                  </p>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Info Banner - Moved to bottom */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Configuration Locked
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1.5 leading-relaxed">
                    To modify workflow settings, deactivate the agent first, then activate it again with your new configuration.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 px-0 h-auto mt-2.5 font-medium"
                    onClick={onDeactivate}
                  >
                    Deactivate Agent →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SheetContent>
  );
}

interface ActivityPanelProps {
  agent: Agent;
}

export function ActivityPanel({ agent }: ActivityPanelProps) {
  const logs = [
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
  ];

  return (
    <SheetContent className="flex flex-col p-0">
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
        <div className="space-y-3">
          {logs.map((log, index) => (
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
                <p className="text-xs text-muted-foreground mt-1">{log.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SheetContent>
  );
}

interface PerformancePanelProps {
  agent: Agent;
}

export function PerformancePanel({ agent }: PerformancePanelProps) {
  return (
    <SheetContent className="flex flex-col p-0">
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
                <span className="text-base font-semibold">{agent.tasksCompleted}</span>
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
    </SheetContent>
  );
}
