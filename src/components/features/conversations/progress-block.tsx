'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Message } from '@/lib/data/dummy-conversations';
import { ChevronRight, Wrench, Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressBlockProps {
  messages: Message[];
  isActive: boolean;
  agentName?: string;
}

/** Decode Unicode escape sequences (\uXXXX, \u{XXXXX}) in string content. */
function decodeUnicodeEscapes(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <span className="block">{children}</span>
  ),
  code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code className={cn('px-0.5 py-0 rounded text-[10px] font-mono bg-muted-foreground/15', className)} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <span className="block my-0.5">{children}</span>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="underline hover:opacity-80" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-4 my-0.5 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-4 my-0.5 space-y-0.5">{children}</ol>
  ),
};

function LogContent({ content, className, mono = false }: { content: string; className?: string; mono?: boolean }) {
  const decoded = decodeUnicodeEscapes(content);
  return (
    <div className={cn('text-[11px] text-muted-foreground/80 leading-relaxed [&>*]:my-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', mono && 'font-mono', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {decoded}
      </ReactMarkdown>
    </div>
  );
}

function ToolStep({ message }: { message: Message }) {
  return (
    <div className="flex gap-2 py-1">
      <Wrench className="h-3 w-3 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 overflow-x-auto">
        <LogContent content={message.content} mono />
      </div>
    </div>
  );
}

function ReasoningStep({ message }: { message: Message }) {
  return (
    <div className="flex gap-2 py-1">
      <Brain className="h-3 w-3 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <LogContent content={message.content} />
      </div>
    </div>
  );
}

export function ProgressBlock({ messages, isActive }: ProgressBlockProps) {
  const [isExpanded, setIsExpanded] = useState(isActive);
  const prevActiveRef = useRef(isActive);

  // Collapse when agent response arrives (isActive transitions true → false)
  useEffect(() => {
    if (prevActiveRef.current && !isActive) {
      setIsExpanded(false);
    }
    prevActiveRef.current = isActive;
  }, [isActive]);
  const reasoningCount = messages.filter(m => m.messageType?.toLowerCase() === 'reasoning').length;
  const toolCount = messages.filter(m => m.messageType?.toLowerCase() === 'tool').length;
  const stepCount = reasoningCount + toolCount;

  // Active (streaming): always expanded, show live updates
  const showExpanded = isActive || isExpanded;

  return (
    <div className="flex gap-3.5">
      <div className="flex-shrink-0 w-8" />
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'rounded-lg overflow-hidden transition-all duration-200',
            isActive
              ? 'bg-muted/30'
              : 'bg-muted/20 hover:bg-muted/30'
          )}
        >
          <button
            type="button"
            onClick={() => !isActive && setIsExpanded(!isExpanded)}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 text-left',
              !isActive && 'cursor-pointer transition-colors'
            )}
          >
            {isActive ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight
                className={cn(
                  'h-3 w-3 text-muted-foreground/70 flex-shrink-0 transition-transform',
                  showExpanded && 'rotate-90'
                )}
              />
            )}
            <span className="text-[11px] text-muted-foreground/70">
              {isActive ? (
                <>{stepCount} step{stepCount !== 1 ? 's' : ''}…</>
              ) : (
                <>{stepCount} step{stepCount !== 1 ? 's' : ''}</>
              )}
            </span>
          </button>

          {showExpanded && (
            <div className="border-t border-border/40 px-2.5 py-1.5 space-y-0 max-h-48 overflow-y-auto">
              {messages.map((message) =>
                message.messageType?.toLowerCase() === 'tool' ? (
                  <ToolStep key={message.id} message={message} />
                ) : (
                  <ReasoningStep key={message.id} message={message} />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
