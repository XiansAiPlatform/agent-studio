import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Loader2, Play, RefreshCw, CheckCircle2 } from 'lucide-react';
import { EnhancedDeployment, EnhancedTemplate } from '../types';
import { truncateToSentences } from '../utils/agent-helpers';

interface AgentDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deployment?: EnhancedDeployment | null;
  template?: EnhancedTemplate | null;
  instanceName?: string;
  instanceDescription?: string;
  onInstanceNameChange?: (name: string) => void;
  onInstanceDescriptionChange?: (description: string) => void;
  onGenerateNewName?: () => void;
  onCreateInstance?: () => void;
  onDeleteAgent?: () => void;
  onDeployTemplate?: () => void;
  isCreatingInstance?: boolean;
  deployingTemplateId?: string | null;
  hasConfiguration?: boolean;
}

export function AgentDetailsSheet({
  open,
  onOpenChange,
  deployment,
  template,
  instanceName = '',
  instanceDescription = '',
  onInstanceNameChange,
  onInstanceDescriptionChange,
  onGenerateNewName,
  onCreateInstance,
  onDeleteAgent,
  onDeployTemplate,
  isCreatingInstance = false,
  deployingTemplateId = null,
  hasConfiguration = false
}: AgentDetailsSheetProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  if (deployment) {
    const text = deployment.summary || deployment.description || 'Deployed agent details';
    const { truncated, isLong, full } = truncateToSentences(text, 2);

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle className="flex items-center gap-2">
              {deployment.icon && (
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center ring-1 ring-green-500/10">
                  <deployment.icon className="h-5 w-5 text-green-600" />
                </div>
              )}
              <span>{deployment.name}</span>
              <Badge variant={deployment.status === 'active' ? 'default' : 'secondary'}>
                {deployment.status}
              </Badge>
            </SheetTitle>
            <div className="space-y-2">
              <SheetDescription>
                {isDescriptionExpanded ? full : truncated}
              </SheetDescription>
              {isLong && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                >
                  {isDescriptionExpanded ? (
                    <>
                      Show less
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    </>
                  ) : (
                    <>
                      Show more
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </SheetHeader>

          <div className="space-y-6 px-6 py-6">
            {/* Configuration Status Banner */}
            {hasConfiguration && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-green-900 dark:text-green-200">Configuration Complete</h4>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Agent workflows have been configured. Now provide a name and description for this instance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Create New Instance Form */}
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground">
                {hasConfiguration ? 'Run Details' : 'Create New Run'}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instance-name">Instance Name *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="instance-name"
                      placeholder="e.g., Customer Support Bot"
                      value={instanceName}
                      onChange={(e) => onInstanceNameChange?.(e.target.value)}
                      disabled={isCreatingInstance}
                      maxLength={100}
                      className="flex-1 bg-white dark:bg-white/10"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={onGenerateNewName}
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
                    onChange={(e) => onInstanceDescriptionChange?.(e.target.value)}
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
              onClick={onCreateInstance}
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
              onClick={onDeleteAgent}
              disabled={isCreatingInstance}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove from Tenant
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (template) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle className="flex items-center gap-2">
              {template.icon && (
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                  <template.icon className="h-5 w-5 text-primary" />
                </div>
              )}
              <span>{template.agent.name}</span>
            </SheetTitle>
            <SheetDescription>
              {template.agent.summary || template.agent.description || 'Agent template details'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-6 py-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 p-3 rounded-lg bg-muted/50 border">
                  <div className="text-xs text-muted-foreground">Workflows</div>
                  <div className="text-lg font-semibold">{template.workflowCount}</div>
                </div>
                {template.agent.author && (
                  <div className="space-y-1 p-3 rounded-lg bg-muted/50 border">
                    <div className="text-xs text-muted-foreground">Author</div>
                    <div className="text-sm font-semibold">{template.agent.author}</div>
                  </div>
                )}
                {template.agent.version && (
                  <div className="space-y-1 p-3 rounded-lg bg-muted/50 border">
                    <div className="text-xs text-muted-foreground">Version</div>
                    <div className="text-sm font-semibold">{template.agent.version}</div>
                  </div>
                )}
                {template.agent.createdAt && (
                  <div className="space-y-1 p-3 rounded-lg bg-muted/50 border">
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="text-sm font-semibold">
                      {new Date(template.agent.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {template.agent.description && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {template.agent.description}
                </p>
              </div>
            )}

            {template.definitions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Available Workflows ({template.definitions.length})
                </h3>
                <ul className="space-y-2">
                  {template.definitions.map((def, idx) => (
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
              onClick={onDeployTemplate}
              disabled={deployingTemplateId === template.agent.id}
            >
              {deployingTemplateId === template.agent.id ? (
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
        </SheetContent>
      </Sheet>
    );
  }

  return null;
}
