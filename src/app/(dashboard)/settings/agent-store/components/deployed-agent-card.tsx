import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bot, Play, MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedDeployment } from '../types';
import { getCategoryLabel } from '../utils/category-utils';

interface DeployedAgentCardProps {
  deployment: EnhancedDeployment;
  isNewlyDeployed?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  onClick?: () => void;
  onStartNewRun?: () => void;
  onDelete?: () => void;
}

export function DeployedAgentCard({ 
  deployment, 
  isNewlyDeployed = false,
  isExpanded = false,
  onToggleExpanded,
  onClick,
  onStartNewRun,
  onDelete
}: DeployedAgentCardProps) {
  const Icon = deployment.icon || Bot;
  const hasDescription = deployment.description && deployment.description.trim() !== '';
  const hasSummary = deployment.summary && deployment.summary.trim() !== '';
  const showExpandButton = hasSummary && hasDescription && deployment.summary !== deployment.description;

  return (
    <article
      className={`group relative flex flex-col rounded-lg border bg-card transition-all duration-200 overflow-hidden ${
        isNewlyDeployed 
          ? 'border-emerald-300 dark:border-emerald-700 shadow-sm shadow-emerald-500/5' 
          : 'border-border hover:border-primary/30 hover:shadow-md'
      }`}
      onClick={onClick}
    >
      {/* Top accent / icon area */}
      <div className="flex items-start gap-4 p-5 pb-4">
        <div className={cn(
          'flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl',
          isNewlyDeployed 
            ? 'bg-emerald-100 dark:bg-emerald-900/30' 
            : 'agent-icon-avatar'
        )}>
          <Icon className={cn('h-6 w-6', isNewlyDeployed && 'text-emerald-600 dark:text-emerald-400')} />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {deployment.name}
              </h3>
              {deployment.category && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary rounded-full shrink-0">
                  {getCategoryLabel(deployment.category)}
                </span>
              )}
              {isNewlyDeployed && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full shrink-0">
                  New
                </span>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Offboard from Organization
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {(deployment.version || deployment.author) && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {deployment.version && <span>v{deployment.version}</span>}
              {deployment.version && deployment.author && ' · '}
              {deployment.author && <span>by {deployment.author}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-5 pb-4 flex-1">
        {(deployment.summary || deployment.description) ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
              {deployment.summary ? deployment.summary : deployment.description}
            </p>
            {showExpandButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpanded?.();
                }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium transition-colors"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">No description</p>
        )}
      </div>

      {/* Expanded full description */}
      {isExpanded && hasDescription && (
        <div className="px-5 pb-4 pt-0 border-t border-slate-100 dark:border-slate-800 mt-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Full description</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {deployment.description}
          </p>
        </div>
      )}

      {/* Action footer */}
      <div className="px-5 py-4 border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {deployment.activationCount ?? 0} run{(deployment.activationCount ?? 0) !== 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onStartNewRun?.();
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            Activate New Run
          </Button>
        </div>
      </div>
    </article>
  );
}
