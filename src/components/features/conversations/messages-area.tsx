'use client';

import { Message } from '@/lib/data/dummy-conversations';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bot, Building2, Loader2, ArrowUp, Info, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { MessageRenderer } from './message-renderer';
import { ProgressBlock } from './progress-block';
import { groupMessages } from './utils/message-groups';
import { getAgentIcon } from '@/app/(dashboard)/settings/agent-store/utils/agent-helpers';
import { getCategoryLabel } from '@/app/(dashboard)/settings/agent-store/utils/category-utils';
import { useTenant } from '@/hooks/use-tenant';

interface MessagesAreaProps {
  messages: Message[];
  agentName: string;
  activationName?: string;
  userName: string;
  topicName: string;
  isLoadingMessages: boolean;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  isTyping: boolean;
  onLoadMoreMessages?: () => void;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  /** Agent info from deployment - shown in empty state when no messages */
  agentInfo?: { summary: string | null; description: string | null; category: string | null; samplePrompts: string[] | null } | null;
  /** Called when user clicks a sample prompt to populate the chat input */
  onSamplePromptClick?: (prompt: string) => void;
}

export function MessagesArea({
  messages,
  agentName,
  activationName,
  userName,
  topicName,
  isLoadingMessages,
  isLoadingMoreMessages,
  hasMoreMessages,
  isTyping,
  onLoadMoreMessages,
  messagesContainerRef,
  messagesEndRef,
  agentInfo,
  onSamplePromptClick,
}: MessagesAreaProps) {
  const groups = groupMessages(messages, isTyping);
  const { currentTenant } = useTenant();
  const logo = currentTenant?.tenant.metadata?.logo;
  const logoSrc = logo?.imgBase64 ? `data:image/png;base64,${logo.imgBase64}` : logo?.url;

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-6 min-h-0 flex flex-col">
      <div className="flex flex-col flex-1 min-h-0 gap-5 max-w-5xl mx-auto w-full">
        {isLoadingMessages ? (
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center text-center">
            <div className="chat-icon-container h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center shadow-2xl mb-4 border border-primary/30">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <p className="text-sm text-foreground font-medium">
              Loading message history...
            </p>
            <p className="text-xs text-foreground mt-2 font-normal">
              Fetching conversation for {topicName}
            </p>
          </div>
        ) : (
          <>
            {isLoadingMoreMessages && (
              <div className="flex items-center justify-center py-4">
                <div className="chat-load-more flex items-center gap-3 px-5 py-3 rounded-xl bg-primary/[0.08] border border-primary/30 shadow-lg">
                  <Loader2 className="h-5 w-5 animate-spin" />
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
                <div className="flex flex-1 min-h-0 flex-col items-center w-full max-w-lg mx-auto">
                  {/* Centered content */}
                  <div className="flex flex-1 min-h-0 flex-col items-center justify-center text-center px-4 w-full">
                  {/* Circular icon - light pale background, dynamic icon */}
                  <div className="h-14 w-14 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4 border border-stone-200/60 dark:border-stone-700/60 overflow-hidden">
                    {logoSrc ? (
                      <Image
                        src={logoSrc}
                        alt={currentTenant?.tenant.name || 'Logo'}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    ) : (
                      <Building2 className="h-7 w-7 text-primary" />
                    )}
                  </div>

                  {/* Category - small regular weight, dark */}
                  {agentInfo?.category && agentInfo.category.trim() && (
                    <p className="text-sm text-foreground/80 font-normal">
                      {getCategoryLabel(agentInfo.category)}
                    </p>
                  )}
                  {/* Activation name + Info icon (description tooltip) */}
                  {activationName && activationName.trim() && (
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <p className="text-lg text-foreground font-medium leading-tight">
                        {activationName}
                      </p>
                      {agentInfo?.description && agentInfo.description.trim() && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 -mt-0.5"
                              aria-label="Show agent description"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side="right"
                            align="center"
                            sideOffset={8}
                            className="relative max-w-sm overflow-visible p-3 rounded-lg bg-stone-900 dark:bg-stone-950 text-white border-0 shadow-lg"
                          >
                            {/* Arrow pointing left towards the icon */}
                            <span
                              className="absolute right-full top-1/2 -translate-y-1/2 h-0 w-0 border-[6px] border-r-stone-900 border-y-transparent border-l-transparent dark:border-r-stone-950"
                              aria-hidden
                            />
                            <p className="text-sm text-left">{agentInfo.description}</p>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}

                  {/* Summary */}
                  {agentInfo?.summary && agentInfo.summary.trim() ? (
                    <div className="flex flex-col items-center gap-2 mb-3">
                      <h2 className="text-sm text-muted-foreground font-normal text-center">
                        {agentInfo.summary.includes('.')
                          ? agentInfo.summary.slice(0, agentInfo.summary.indexOf('.') + 1).trim()
                          : agentInfo.summary}
                      </h2>
                      {/* Subtext - rest of summary after first sentence */}
                      {agentInfo.summary.includes('.') &&
                        agentInfo.summary.slice(agentInfo.summary.indexOf('.') + 1).trim() && (
                          <p className="text-sm text-muted-foreground w-full font-normal leading-relaxed text-center">
                            {agentInfo.summary
                              .slice(agentInfo.summary.indexOf('.') + 1)
                              .trim()}
                          </p>
                        )}
                    </div>
                  ) : null}

                  {/* Sample prompts - up to 6 in 3x2 grid */}
                  {agentInfo?.samplePrompts && agentInfo.samplePrompts.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 w-full mt-4 max-w-md mb-4">
                      {agentInfo.samplePrompts.slice(0, 6).map((prompt, i) => (
                        <button
                          key={i}
                          type="button"
                          title={prompt}
                          onClick={() => onSamplePromptClick?.(prompt)}
                          className="group flex items-center gap-3 text-left text-[13px] leading-snug px-4 py-4 min-h-[5rem] rounded-lg border border-stone-200 dark:border-stone-600/50 bg-stone-50/50 dark:bg-stone-800/30 hover:bg-stone-100/80 dark:hover:bg-stone-700/40 hover:border-stone-300 dark:hover:border-stone-600 text-foreground/85 transition-colors duration-150 cursor-pointer"
                        >
                          <div className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground/70">
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <span className="line-clamp-2">
                            {prompt}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  </div>

                  {/* CTA at bottom - centered, close to bottom border */}
                  <p className="text-xs text-muted-foreground text-center px-4 pb-0 -mb-8 mt-auto w-full">
                    Start a conversation by typing a message below
                  </p>
                </div>
            )}

            {isTyping && (
              <div className="flex items-center gap-3 animate-in fade-in duration-300 pb-4">
                <div className="chat-avatar chat-avatar--agent h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="message-bubble message-bubble--agent bg-muted/50 rounded-2xl px-4 py-2.5">
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
