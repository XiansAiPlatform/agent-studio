'use client';

import { Message } from '@/lib/data/dummy-conversations';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, ArrowUp } from 'lucide-react';
import { MessageRenderer } from './message-renderer';
import { ProgressBlock } from './progress-block';
import { groupMessages } from './utils/message-groups';

interface MessagesAreaProps {
  messages: Message[];
  agentName: string;
  userName: string;
  topicName: string;
  isLoadingMessages: boolean;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  isTyping: boolean;
  onLoadMoreMessages?: () => void;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function MessagesArea({
  messages,
  agentName,
  userName,
  topicName,
  isLoadingMessages,
  isLoadingMoreMessages,
  hasMoreMessages,
  isTyping,
  onLoadMoreMessages,
  messagesContainerRef,
  messagesEndRef,
}: MessagesAreaProps) {
  const groups = groupMessages(messages, isTyping);

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
      <div className="space-y-5 max-w-5xl mx-auto">
        {isLoadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center shadow-2xl mb-4 border border-primary/30">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-sm text-foreground font-bold">
              Loading message history...
            </p>
            <p className="text-xs text-primary/70 mt-2 font-semibold">
              Fetching conversation for {topicName}
            </p>
          </div>
        ) : (
          <>
            {isLoadingMoreMessages && (
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-primary/[0.08] border border-primary/30 shadow-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-xs text-foreground font-bold">
                    Loading more messages...
                  </p>
                </div>
              </div>
            )}

            {!isLoadingMoreMessages && hasMoreMessages && messages.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMoreMessages}
                  className="gap-2 text-xs rounded-full hover:bg-muted transition-all duration-200"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Load earlier messages
                </Button>
              </div>
            )}

            {groups.length > 0 ? (
              groups.map((group, index) => {
                if (group.type === 'progress-block' && group.messages) {
                  return (
                    <ProgressBlock
                      key={`progress-${group.messages[0]?.id ?? index}`}
                      messages={group.messages}
                      isActive={group.isActive ?? false}
                      agentName={agentName}
                    />
                  );
                }
                if (group.message) {
                  return (
                    <MessageRenderer
                      key={group.message.id}
                      message={group.message}
                      agentName={agentName}
                      userName={userName}
                    />
                  );
                }
                return null;
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
                <div className="h-20 w-20 rounded-3xl bg-primary/20 flex items-center justify-center mb-5 shadow-2xl border border-primary/40">
                  <Bot className="h-10 w-10 text-primary" />
                </div>

                <p className="text-sm text-primary/70 max-w-sm font-semibold">
                  Start a conversation by typing a message below
                </p>
              </div>
            )}

            {isTyping && (
              <div className="flex items-center gap-3 animate-in fade-in duration-300">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="bg-muted/50 rounded-2xl px-4 py-2.5">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
