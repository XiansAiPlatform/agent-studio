import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconAvatar } from '@/components/ui/icon-avatar';
import { Bot } from 'lucide-react';
import { AGENT_STATUS_CONFIG } from '@/lib/agent-status-config';
import { Agent } from '../types';

interface AgentCardProps {
  agent: Agent;
  isNewlyCreated?: boolean;
  onClick: () => void;
}

export function AgentCard({ agent, isNewlyCreated, onClick }: AgentCardProps) {
  return (
    <Card 
      className={`hover:shadow-lg transition-all duration-300 cursor-pointer ${
        isNewlyCreated ? 'border-2 border-green-500' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <IconAvatar 
            icon={Bot} 
            variant={agent.variant} 
            size="lg" 
            rounded="md" 
            pulse={agent.status === 'active'} 
          />
          <div className="flex flex-col gap-1.5 items-end">
            {isNewlyCreated && (
              <Badge 
                variant="default" 
                className="text-xs font-semibold bg-green-600 hover:bg-green-600"
              >
                NEW
              </Badge>
            )}
            <Badge 
              variant={AGENT_STATUS_CONFIG[agent.status].variant}
              className={AGENT_STATUS_CONFIG[agent.status].colors.badge}
            >
              {AGENT_STATUS_CONFIG[agent.status].label}
            </Badge>
          </div>
        </div>
        <div>
          <Badge 
            variant="outline" 
            className="font-semibold text-xs border whitespace-normal break-words bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700"
          >
            {agent.template}
          </Badge>
        </div>
        <div className="space-y-4">
          <CardTitle className="whitespace-normal break-words">{agent.name}</CardTitle>
          <CardDescription className="whitespace-normal break-words">
            {agent.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2.5">
          {agent.uptime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground">Uptime:</span>
              <span className="text-xs font-medium">{agent.uptime}</span>
            </div>
          )}
          {agent.lastActive && (
            <div className="text-sm">
              <span className="text-xs text-muted-foreground">Last Modified: </span>
              <span className="text-xs font-medium">{agent.lastActive}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
