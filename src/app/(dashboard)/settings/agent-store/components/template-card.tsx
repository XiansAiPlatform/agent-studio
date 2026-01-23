import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Play, Zap, Loader2 } from 'lucide-react';
import { EnhancedTemplate } from '../types';

interface TemplateCardProps {
  template: EnhancedTemplate;
  isDeploying?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  onDeploy?: (e: React.MouseEvent) => void;
}

export function TemplateCard({ 
  template, 
  isDeploying = false,
  isExpanded = false,
  onToggleExpanded,
  onDeploy 
}: TemplateCardProps) {
  const Icon = template.icon || Bot;
  const hasDescription = template.agent.description && template.agent.description.trim() !== '';
  const hasSummary = template.agent.summary && template.agent.summary.trim() !== '';
  const hasWorkflows = template.definitions && template.definitions.length > 0;
  // Show expand button if there's description, workflows, or both
  const showExpandButton = (hasSummary && hasDescription && template.agent.summary !== template.agent.description) || hasWorkflows;

  return (
    <Card 
      className="group hover:shadow-md transition-all duration-300 hover:border-primary/50 cursor-pointer"
      onClick={onToggleExpanded}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center ring-1 ring-primary/10 flex-shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                  {template.agent.name}
                </CardTitle>
                <div className="mt-1 space-y-2">
                  {(template.agent.summary || template.agent.description) && (
                    <CardDescription className="text-sm leading-relaxed line-clamp-2">
                      {template.agent.summary ? template.agent.summary : (
                        template.agent.description && template.agent.description.length > 150 
                          ? template.agent.description.substring(0, 150) + '...' 
                          : template.agent.description
                      )}
                    </CardDescription>
                  )}
                  {isExpanded && (
                    <div className="pt-2 border-t border-border space-y-3">
                      {hasDescription && (
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold mb-1">Full Description</p>
                          <CardDescription className="text-sm leading-relaxed">
                            {template.agent.description}
                          </CardDescription>
                        </div>
                      )}
                      {hasWorkflows && (
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold mb-2">
                            Workflows ({template.definitions.length})
                          </p>
                          <div className="space-y-2">
                            {template.definitions.map((def, idx) => (
                              <div key={idx} className="p-2 rounded-md bg-muted/50 border border-muted">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-foreground">
                                      {def.name || def.workflowType.split(':')[1]}
                                    </p>
                                    {def.parameterDefinitions && def.parameterDefinitions.length > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {def.parameterDefinitions.length} parameter{def.parameterDefinitions.length !== 1 ? 's' : ''}
                                        {def.parameterDefinitions.some(p => !p.optional) && (
                                          <span className="text-orange-600 dark:text-orange-400"> (required)</span>
                                        )}
                                      </p>
                                    )}
                                  </div>
                                  {def.activable && (
                                    <Badge variant="outline" className="text-xs">Activated Automatically</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {template.agent.version && (
                <Badge variant="outline" className="text-xs font-medium border-primary/20 text-primary flex-shrink-0">
                  v{template.agent.version}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              <span>{template.workflowCount} workflow{template.workflowCount !== 1 ? 's' : ''}</span>
            </div>
            {template.agent.author && (
              <div className="flex items-center gap-1.5">
                <span>By {template.agent.author}</span>
              </div>
            )}
          </div>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeploy?.(e);
            }}
            disabled={isDeploying}
            className="flex-shrink-0"
          >
            {isDeploying ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Play className="mr-2 h-3.5 w-3.5" />
                Onboard
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
