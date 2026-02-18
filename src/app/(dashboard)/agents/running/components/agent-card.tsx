import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconAvatar } from '@/components/ui/icon-avatar';
import { Bot } from 'lucide-react';
import { AgentStatusBadge } from '@/components/features/agents';
import { Agent } from '../types';

interface AgentCardProps {
  agent: Agent;
  isNewlyCreated?: boolean;
  currentUserEmail?: string | null;
  onClick: () => void;
}

export function AgentCard({ agent, isNewlyCreated, currentUserEmail, onClick }: AgentCardProps) {
  const isCurrentUser = currentUserEmail && agent.participantId === currentUserEmail;
  const isInactive = agent.status === 'inactive';
  return (
    <Card 
      className={`hover:bg-muted/50 transition-all duration-200 cursor-pointer border ${
        isInactive 
          ? 'border-muted-foreground/20 bg-muted/30 dark:bg-muted/20' 
          : isNewlyCreated 
            ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' 
            : 'border-border/50'
      }`}
      onClick={onClick}
    >
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <IconAvatar 
            icon={Bot} 
            variant={agent.variant} 
            size="md" 
            rounded="full" 
            pulse={agent.status === 'active'} 
          />
          <div className="flex items-center gap-2">
            {isNewlyCreated && !isInactive && (
              <Badge 
                variant="default" 
                className="text-xs bg-emerald-600 hover:bg-emerald-600"
              >
                NEW
              </Badge>
            )}
            <AgentStatusBadge 
              status={agent.status}
              size="sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-base whitespace-normal break-words">{agent.name}</CardTitle>
          <div className="text-xs text-muted-foreground">{agent.template}</div>
        </div>
      </CardHeader>
      {(agent.uptime || agent.lastActive || agent.participantId) && (
        <CardContent className="pt-0 pb-4">
          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            {agent.participantId && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Owner:</span>
                {isCurrentUser ? (
                  <span className="truncate font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    me
                  </span>
                ) : (
                  <span className="truncate">{agent.participantId}</span>
                )}
              </div>
            )}
            {(agent.uptime || agent.lastActive) && (
              <div className="flex items-center gap-3">
                {agent.uptime && (
                  <>
                    <span>Uptime: {agent.uptime}</span>
                  </>
                )}
                {agent.lastActive && (
                  <>
                    {agent.uptime && <span>•</span>}
                    <span>Modified {agent.lastActive}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
