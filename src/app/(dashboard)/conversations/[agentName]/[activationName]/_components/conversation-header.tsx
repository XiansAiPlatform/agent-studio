import { Bot, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Topic } from '@/lib/data/dummy-conversations';
import { useParticipantLayout } from '@/contexts/participant-layout-context';

interface ConversationHeaderProps {
  activationName: string;
  topic: Topic;
  isConnected: boolean;
  isAgentActive: boolean;
}

/**
 * Conversation Header Component
 *
 * Displays the current activation name, topic name, message count,
 * and SSE connection status with a visual indicator.
 * In participant mode, includes a hamburger menu to browse agents/topics.
 */
export function ConversationHeader({
  activationName,
  topic,
  isConnected,
  isAgentActive,
}: ConversationHeaderProps) {
  const { onOpenMenu } = useParticipantLayout();

  return (
    <div className="border-b border-border/50 bg-card px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Agent Icon + Activation & Topic Info */}
        <div className="flex items-center gap-3">
          {/* Participant: Menu button */}
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background hover:bg-muted/80 transition-colors"
              aria-label="Open conversation menu"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          {/* Agent Avatar with Sonar Pulse (only when connected AND agent is active) */}
          <div className="relative inline-flex">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative z-10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            {isConnected && isAgentActive && (
              <div className="sonar-container absolute inset-0 rounded-full" />
            )}
          </div>
          
          {/* Activation & Topic Info */}
          <div>
            {/* Activation Name */}
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-medium text-sm text-foreground">
                {activationName}
              </h3>
            </div>
            
            {/* Topic Name & Message Count */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">
                {topic.name}
              </span>
              <span className="text-xs text-muted-foreground/60">•</span>
              <span className="text-xs text-muted-foreground/60">
                {topic.messageCount ?? topic.messages.length} messages
              </span>
            </div>
          </div>
        </div>

        {/* SSE Connection Status */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 text-xs",
            isConnected 
              ? "text-emerald-600 dark:text-emerald-400" 
              : "text-muted-foreground"
          )}>
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              isConnected && "bg-emerald-500 animate-pulse"
            )} />
            {isConnected && 'Live'}
          </div>
        </div>
      </div>
    </div>
  );
}
