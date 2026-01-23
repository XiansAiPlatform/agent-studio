import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card 
      className={`group hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer flex flex-col ${
        isNewlyDeployed 
          ? 'ring-2 ring-green-500 ring-offset-2 shadow-xl shadow-green-500/30 bg-green-50 dark:bg-green-950/20 border-green-500' 
          : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-4 flex-grow flex flex-col justify-start">
        <div className="flex items-start justify-between gap-3 min-h-[56px]">
          <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center ring-1 ring-green-500/10 flex-shrink-0">
            <Icon className="h-7 w-7 text-green-600" />
          </div>
          <div className="flex flex-col gap-1.5 items-end min-h-[56px] justify-start">
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
        <div className="mt-2 space-y-3">
          <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors">
            {deployment.name}
          </CardTitle>
          
          {/* Stats Row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-500" />
              <span>{deployment.activationCount ?? 0} activation{(deployment.activationCount ?? 0) !== 1 ? 's' : ''}</span>
            </div>
            <span className="text-muted-foreground/50">•</span>
            <div className="flex items-center gap-1.5">
              <span>
                {new Date(deployment.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {(deployment.summary || deployment.description) && (
            <div className="space-y-2">
              <CardDescription className="text-sm leading-relaxed line-clamp-2">
                {deployment.summary ? deployment.summary : deployment.description}
              </CardDescription>
              {showExpandButton && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpanded?.();
                  }}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                >
                  {isExpanded ? (
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
              {isExpanded && hasDescription && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Full Description</p>
                  <CardDescription className="text-sm leading-relaxed">
                    {deployment.description}
                  </CardDescription>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 mt-auto">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {deployment.version && (
            <>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs font-normal">
                  v{deployment.version}
                </Badge>
              </div>
            </>
          )}
          {deployment.author && (
            <>
              {deployment.version && <span className="text-muted-foreground/50">•</span>}
              <span>by {deployment.author}</span>
            </>
          )}
          {!deployment.version && !deployment.author && (
            <span className="text-muted-foreground/60">No version info</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onStartNewRun?.();
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            Start New Run
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                className="text-destructive focus:text-white hover:text-white cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2 text-red-600 group-hover:text-white" />
                Offboard from Tenant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
