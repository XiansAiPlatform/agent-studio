import { useState } from 'react';
import { AlertTriangle, Bot, CheckCheck, Loader2, PanelLeft, ListTodo } from 'lucide-react';
import { toast } from 'sonner';
import { ParticipantMenuButton } from './participant-menu-bar';
import { cn } from '@/lib/utils';
import { Topic } from '@/types/conversation';
import { useParticipantLayout } from '@/contexts/participant-layout-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMyPendingTaskCount } from '@/app/(dashboard)/dashboard/hooks/use-my-pending-task-count';

interface ConversationHeaderProps {
  activationName: string;
  topic?: Topic;
  /** Tenant id, used to call the mark-thread-read Admin API. */
  tenantId?: string;
  /** Conversation thread id (server-persisted; spans all topics), derived from a loaded message. */
  threadId?: string;
  /** Built-in workflow name shown before the discussion name. */
  workflowName?: string;
  /** How many built-in workflows this agent has. Used to hint that the user can switch. */
  workflowCount?: number;
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
  /**
   * Admin-mode mobile only: opens the TopicSidebar drawer. Renders a button
   * that is hidden at `md+`. Ignored in participant mode (which uses
   * `useParticipantLayout().onOpenMenu` instead).
   */
  onOpenTopics?: () => void;
  agentName?: string;
}

/**
 * Conversation Header Component
 *
 * Displays the current activation name, workflow, topic name, message count,
 * and SSE connection status with a visual indicator.
 * In participant mode, includes a hamburger menu to browse agents/topics.
 */
export function ConversationHeader({
  activationName,
  topic,
  tenantId,
  threadId,
  workflowName,
  workflowCount = 0,
  isConnected,
  isAgentActive,
  workerAvailable = null,
  serverUnavailable = false,
  isHeartbeatLoading = false,
  onRetryHeartbeat,
  onOpenTopics,
  agentName,
}: ConversationHeaderProps) {
  const { onOpenMenu } = useParticipantLayout();
  const { count: pendingCount } = useMyPendingTaskCount(Boolean(agentName && activationName), {
    pollIntervalMs: 20_000,
    agentName,
    activationName,
  });
  // In admin mode (no participant menu), expose a topics drawer button on mobile.
  const showAdminTopicsBtn = !onOpenMenu && Boolean(onOpenTopics);

  // Server-persisted unread tracking (ConversationMessage.status), distinct from the
  // ephemeral per-topic SSE badge shown in the topic sidebar. `readCutoff` optimistically
  // treats everything up to the last successful mark-as-read call as read, until the next
  // history fetch confirms it server-side. It resets when the thread itself changes.
  const [readCutoff, setReadCutoff] = useState<string | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  // Reset the optimistic cutoff when the thread itself changes (React's
  // "adjust state during render" pattern, avoiding an extra effect-driven render).
  const [cutoffForThread, setCutoffForThread] = useState(threadId);
  if (threadId !== cutoffForThread) {
    setCutoffForThread(threadId);
    setReadCutoff(null);
  }

  const unreadCount = topic
    ? topic.messages.filter(
        (m) => m.readStatus !== 'Read' && (!readCutoff || m.timestamp > readCutoff)
      ).length
    : 0;

  const handleMarkThreadRead = async () => {
    if (!tenantId || !threadId || isMarkingRead) return;
    setIsMarkingRead(true);
    const cutoff = new Date().toISOString();
    try {
      const res = await fetch(`/api/messaging/threads/${threadId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: cutoff }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Request failed (${res.status})`);
      }

      const result = (await res.json()) as { markedCount: number; unreadCount: number };
      setReadCutoff(cutoff);
      toast.success(
        result.markedCount > 0
          ? `Marked ${result.markedCount} message${result.markedCount === 1 ? '' : 's'} as read`
          : 'Thread already up to date',
        { description: `${result.unreadCount} unread remaining in thread`, duration: 3000 }
      );
    } catch (error) {
      toast.error('Failed to mark thread as read', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsMarkingRead(false);
    }
  };

  const showLive = workerAvailable === true && isConnected && isAgentActive;
  const showWorkerWarning = workerAvailable === false && !serverUnavailable;
  const showServerWarning = serverUnavailable;
  const showChecking = isHeartbeatLoading || (workerAvailable === null && isAgentActive && !serverUnavailable);
  const canSwitchWorkflow = workflowCount > 1;
  const openSwitcher = onOpenMenu ?? onOpenTopics;

  return (
    <div className="border-b border-border/50 bg-card px-3 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        {/* Agent Icon + Activation & Topic Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onOpenMenu && <ParticipantMenuButton onClick={onOpenMenu} />}
          {showAdminTopicsBtn && (
            <button
              type="button"
              onClick={onOpenTopics}
              className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background hover:bg-muted/80 transition-colors"
              aria-label="Open topics"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
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
          <div className="min-w-0">
            {/* Activation Name */}
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-medium text-sm text-foreground truncate">
                {activationName}
              </h3>
            </div>

            {/* Workflow, topic name, and message count */}
            <div className="flex items-center gap-1.5 min-w-0">
              {workflowName && canSwitchWorkflow && openSwitcher ? (
                <button
                  type="button"
                  onClick={openSwitcher}
                  className="inline-flex items-center gap-1 min-w-0 rounded-md px-1 -mx-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  title={`${workflowCount} workflows available. Click to switch.`}
                >
                  <span className="truncate">{workflowName}</span>
                  <span className="hidden sm:inline shrink-0 text-[10px] font-medium text-primary/80">
                    {workflowCount} workflows
                  </span>
                </button>
              ) : workflowName && canSwitchWorkflow ? (
                <span
                  className="inline-flex items-center gap-1 min-w-0 text-xs font-medium text-primary"
                  title={`${workflowCount} workflows available. Switch from the list.`}
                >
                  <span className="truncate">{workflowName}</span>
                  <span className="hidden sm:inline shrink-0 text-[10px] font-medium text-primary/80">
                    {workflowCount} workflows
                  </span>
                </span>
              ) : workflowName ? (
                <span className="text-xs text-muted-foreground font-medium truncate">
                  {workflowName}
                </span>
              ) : null}
              {topic && (
                <>
                  {workflowName && (
                    <span className="text-xs text-muted-foreground/60">•</span>
                  )}
                  <span className="text-xs text-muted-foreground font-medium truncate">
                    {topic.name}
                  </span>
                  <span className="text-xs text-muted-foreground/60 hidden sm:inline">•</span>
                  <span className="text-xs text-muted-foreground/60 hidden sm:inline whitespace-nowrap">
                    {topic.messageCount ?? topic.messages.length} messages
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Worker Status: Live, Checking, or Warning */}
        <div className="flex items-center gap-2 shrink-0">
          {topic && tenantId && threadId && (
            <>
              {unreadCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs"
                  title="Persisted unread count (ConversationMessage.status)"
                >
                  {unreadCount} unread
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkThreadRead}
                disabled={isMarkingRead || unreadCount === 0}
                className="h-8 px-2 text-xs gap-1.5"
                title="Mark all messages in this thread as read"
              >
                {isMarkingRead ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Mark read
              </Button>
            </>
          )}
          {pendingCount > 0 && agentName && (
            <Link
              href={`/tasks?status=pending&agent=${encodeURIComponent(agentName)}&activation=${encodeURIComponent(activationName)}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                'border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200/80',
                'dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25'
              )}
            >
              <ListTodo className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {pendingCount === 1 ? '1 task waiting' : `${pendingCount} tasks waiting`}
              </span>
              <Badge
                variant="secondary"
                className="h-4 min-w-4 px-1 text-[10px] tabular-nums sm:hidden bg-amber-800 text-amber-50 dark:bg-amber-300 dark:text-amber-950"
              >
                {pendingCount}
              </Badge>
            </Link>
          )}
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
              <span>Agent unavailable</span>
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
