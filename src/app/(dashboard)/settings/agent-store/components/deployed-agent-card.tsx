import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bot, CheckCircle2, Play, MoreVertical, Trash2 } from 'lucide-react';
import { EnhancedDeployment } from '../types';

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
    <div 
      className={`group py-7 px-6 cursor-pointer transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/30 border-b border-slate-200/60 dark:border-slate-700/60 last:border-b-0 ${
        isNewlyDeployed 
          ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-b-emerald-200 dark:border-b-emerald-700' 
          : ''
      }`}
      onClick={onClick}
    >
      {/* Main Content Row */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Icon & Name Column */}
        <div className="col-span-4 flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Icon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                {deployment.name}
              </h3>
              {isNewlyDeployed && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded">
                  New
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              
              {deployment.version && (
                <span className="text-xs text-slate-400">v{deployment.version}</span>
              )}
              .
              {deployment.author && (
                <span className="text-xs text-slate-400">by {deployment.author}</span>
              )}
              .
              <span className="text-xs text-slate-400">
                published on {new Date(deployment.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Description Column */}
        <div className="col-span-5">
          {(deployment.summary || deployment.description) && (
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
          )}
        </div>

        {/* Stats Column */}
        <div className="col-span-2 text-sm text-slate-500 dark:text-slate-400">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-xs">{deployment.activationCount ?? 0} runs</span>
            </div>
          </div>
        </div>

        {/* Actions Column */}
        <div className="col-span-1 flex items-start justify-end">
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-3 text-slate-600 hover:text-white dark:text-slate-400 dark:hover:text-white hover:bg-primary dark:hover:bg-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onStartNewRun?.();
              }}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">Activate New</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
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
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && hasDescription && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-12 gap-6">
          <div className="col-span-9 col-start-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Full Description</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {deployment.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
