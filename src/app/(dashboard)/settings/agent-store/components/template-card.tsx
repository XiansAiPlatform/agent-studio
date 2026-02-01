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
  const showExpandButton = (hasSummary && hasDescription && template.agent.summary !== template.agent.description) || hasWorkflows;

  // Removed debug logging

  return (
    <div 
      className={`group py-6 px-6 cursor-pointer transition-all duration-200 rounded-lg border mb-3 ${
        isExpanded 
          ? 'bg-blue-50/50 dark:bg-slate-800/50 border-blue-200 dark:border-slate-600 shadow-md' 
          : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
      }`}
      onClick={() => onToggleExpanded?.()}
      title="Click to expand and view details"
    >
      <div className="flex items-start justify-between gap-6">
        {/* Left Content */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400 flex-shrink-0" />
            <div className="flex items-center gap-3">
              <h4 className="text-base font-medium text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                {template.agent.name}
              </h4>
              {template.agent.version && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full">
                  v{template.agent.version}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 max-w-xl">
            {(template.agent.summary || template.agent.description) && (
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                {template.agent.summary ? template.agent.summary : template.agent.description}
              </p>
            )}
            
            {/* Always show expand button for cards with workflows */}
            {(showExpandButton || hasWorkflows) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpanded?.();
                }}
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium transition-colors flex items-center gap-1"
              >
                {isExpanded ? 'Hide details' : 'Show details'}
                <svg 
                  className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            
            {/* Expanded Content */}
            {isExpanded && (
              <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-4 bg-blue-50/40 dark:bg-slate-800/40 -mx-6 px-6 pb-3">
                {/* Full Description */}
                {hasDescription && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Full Description</p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                      {template.agent.description}
                    </p>
                  </div>
                )}
                
                {/* Workflows */}
                {hasWorkflows && template.definitions && template.definitions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">
                      Workflows ({template.definitions.length})
                    </p>
                    <div className="space-y-2">
                      {template.definitions.map((def, idx) => (
                        <div key={idx} className="py-3 px-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {def.name || def.workflowType?.split(':')[1] || 'Workflow'}
                              </p>
                              {def.parameterDefinitions && def.parameterDefinitions.length > 0 && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {def.parameterDefinitions.length} parameter{def.parameterDefinitions.length !== 1 ? 's' : ''}
                                  {def.parameterDefinitions.some(p => !p.optional) && (
                                    <span className="text-amber-600 dark:text-amber-400"> (required)</span>
                                  )}
                                </p>
                              )}
                            </div>
                            {def.activable && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                                Auto-activated
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Show message if no expandable content */}
                {!hasDescription && !hasWorkflows && (
                  <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm italic">
                    No additional details available
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              <span>{template.workflowCount} workflow{template.workflowCount !== 1 ? 's' : ''}</span>
            </div>
            {template.agent.author && (
              <div>by {template.agent.author}</div>
            )}
          </div>
        </div>

        {/* Right Action */}
        <div className="flex items-center gap-2">
          {/* Expand indicator */}
          {(showExpandButton || hasWorkflows) && (
            <div className="opacity-40 group-hover:opacity-60 transition-opacity">
              <svg 
                className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
          
          <div className="opacity-70 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="default"
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 border-0 shadow-sm font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onDeploy?.(e);
              }}
              disabled={isDeploying}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Onboarding...
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-4 w-4" />
                  Onboard to Organization
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
