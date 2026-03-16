import { AlertTriangle, Bot, Loader2 } from 'lucide-react';
import { ParticipantMenuButton } from './participant-menu-bar';
import { cn } from '@/lib/utils';
import { Topic } from '@/lib/data/dummy-conversations';
import { useParticipantLayout } from '@/contexts/participant-layout-context';

interface ConversationHeaderProps {
  activationName: string;
  topic: Topic;
  isConnected: boolean;
  isAgentActive: boolean;
  /** Agent worker liveness from heartbeat. null = checking. */
  workerAvailable?: boolean | null;
  /** true when API/server unreachable (distinct from worker unavailable) */
  serverUnavailable?: boolean;
  /** Whether heartbeat check is in progress */
  isHeartbeatLoading?: boolean;
  /** Called when user clicks status (Live or Worker unavailable) to re-check heartbeat */
  onRetryHeartbeat?: () => void;
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
  workerAvailable = null,
  serverUnavailable = false,
  isHeartbeatLoading = false,
  onRetryHeartbeat,
}: ConversationHeaderProps) {
  const { onOpenMenu } = useParticipantLayout();

  const showLive = workerAvailable === true && isConnected && isAgentActive;
  const showWorkerWarning = workerAvailable === false && !serverUnavailable;
  const showServerWarning = serverUnavailable;
  const showChecking = isHeartbeatLoading || (workerAvailable === null && isAgentActive && !serverUnavailable);

  return (
    <div className="border-b border-border/50 bg-card px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Agent Icon + Activation & Topic Info */}
        <div className="flex items-center gap-3">
          {onOpenMenu && <ParticipantMenuButton onClick={onOpenMenu} />}
          {/* Agent Avatar with Sonar Pulse (only when connected AND agent is active) */}
          <div className="relative inline-flex">
            <div className="chat-header-avatar h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative z-10">
              <Bot className="h-4 w-4" />
            </div>
            {showLive && (
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

        {/* Worker Status: Live, Checking, or Warning */}
        <div className="flex items-center gap-2">
          {showChecking ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Checking…</span>
            </div>
          ) : showServerWarning ? (
            <button
              type="button"
              onClick={onRetryHeartbeat}
              className={cn(
                "flex items-center gap-1.5 text-xs text-destructive",
                "hover:text-destructive/90 hover:underline",
                "cursor-pointer transition-colors"
              )}
              title="Server unreachable. Click to check again."
              disabled={isHeartbeatLoading}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Server unavailable</span>
            </button>
          ) : showWorkerWarning ? (
            <button
              type="button"
              onClick={onRetryHeartbeat}
              className={cn(
                "flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400",
                "hover:text-amber-700 dark:hover:text-amber-300 hover:underline",
                "cursor-pointer transition-colors"
              )}
              title="Agent worker is not available. Click to check again."
              disabled={isHeartbeatLoading}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Worker unavailable</span>
            </button>
          ) : showLive ? (
            <button
              type="button"
              onClick={onRetryHeartbeat}
              className={cn(
                "flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400",
                "hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline",
                "cursor-pointer transition-colors"
              )}
              title="Agent worker is live. Click to check again."
              disabled={isHeartbeatLoading}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
