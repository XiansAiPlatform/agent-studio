'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, RefreshCw } from 'lucide-react';

interface KnowledgePageHeaderProps {
  agentName: string;
  activationName: string;
  lastFetchedParams: { agent: string; activation: string } | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function KnowledgePageHeader({
  agentName,
  activationName,
  lastFetchedParams,
  isLoading,
  onRefresh,
}: KnowledgePageHeaderProps) {
  const hasContext = agentName && activationName;

  if (hasContext) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-semibold text-foreground truncate">
                  {activationName}
                </h1>
                <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                  <Bot className="h-3.5 w-3.5" />
                  {agentName}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                Agent knowledge and the levels of overriding
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastFetchedParams && (
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
                title="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="shrink-0">
        <h1 className="text-3xl font-semibold text-foreground">
          Knowledge Base
        </h1>
        <p className="text-muted-foreground mt-1">
          Select an agent and activation to view knowledge configuration
        </p>
      </div>
    </div>
  );
}
