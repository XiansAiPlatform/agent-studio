'use client';

import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCopyFeedback } from '@/hooks/use-copy-feedback';
import type { Message } from '@/types/conversation';
import type { MarkdownVariant } from './markdown-message';
import { MessageFeedbackPrompt } from './message-feedback';

interface MessageActionsToolbarProps {
  message: Message;
  agentName?: string;
  timestamp: string;
  variant: MarkdownVariant;
  /** Text copied to the clipboard when the copy action is clicked. */
  copyText: string;
  disableFeedback?: boolean;
  onMessageFeedbackSubmitted?: (
    messageId: string,
    feedback: NonNullable<Message['feedback']>
  ) => void;
}

/**
 * Hover/focus-revealed timestamp + action icons, shown below a message.
 * Expects an ancestor with the `group` class (message-item.tsx's column root)
 * so `group-hover`/`group-focus-within` can drive its visibility.
 */
export function MessageActionsToolbar({
  message,
  agentName,
  timestamp,
  variant,
  copyText,
  disableFeedback,
  onMessageFeedbackSubmitted,
}: MessageActionsToolbarProps) {
  const [copied, copy] = useCopyFeedback();

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex items-center gap-0.5 px-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100',
          variant === 'user' ? 'justify-end' : 'justify-start'
        )}
      >
        <span className="text-[10px] font-medium text-muted-foreground/60 pr-1">
          {timestamp}
        </span>
        <div className="h-3 w-px bg-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => copy(copyText)}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="sr-only">Copy</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{copied ? 'Copied' : 'Copy'}</p>
          </TooltipContent>
        </Tooltip>

        {variant === 'agent' && !disableFeedback && (
          <MessageFeedbackPrompt
            message={message}
            agentName={agentName ?? 'Agent'}
            onFeedbackSubmitted={onMessageFeedbackSubmitted}
            iconOnly
          />
        )}
      </div>
    </TooltipProvider>
  );
}
