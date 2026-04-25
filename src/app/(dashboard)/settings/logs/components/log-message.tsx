'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { cn } from '@/lib/utils';

interface LogMessageProps {
  message: string;
  /**
   * `block` renders full markdown (multi-line, headings, lists, code, tables).
   * `inline` strips markdown to plain text for compact one-line previews.
   * Defaults to `block`.
   */
  mode?: 'block' | 'inline';
  className?: string;
  title?: string;
}

/**
 * Strip common markdown syntax to get a clean one-line preview.
 * Used for stream cards where a compact, truncatable single-line preview
 * is more useful than rendered markdown.
 */
function stripMarkdown(input: string): string {
  if (!input) return '';
  let text = input;

  // Remove fenced code blocks (keep the inner code on one line)
  text = text.replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, (_, code) =>
    code.replace(/\s+/g, ' ').trim()
  );
  // Inline code: keep content, drop backticks
  text = text.replace(/`([^`]+)`/g, '$1');
  // Images: drop entirely (alt text only would be confusing here)
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  // Links: keep label only
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Reference-style link defs
  text = text.replace(/^\[[^\]]+\]:\s*\S+.*$/gm, '');
  // Headings: drop leading #'s
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  // Blockquotes
  text = text.replace(/^\s{0,3}>\s?/gm, '');
  // Horizontal rules
  text = text.replace(/^\s*([-*_])\s*\1\s*\1[\s\S]*?$/gm, '');
  // List bullets/numbers
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  // Bold / italic / strikethrough markers (keep content)
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/~~(.*?)~~/g, '$1');
  // HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Collapse whitespace to single spaces
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export function LogMessage({
  message,
  mode = 'block',
  className,
  title,
}: LogMessageProps) {
  if (!message) return null;

  if (mode === 'inline') {
    const plain = stripMarkdown(message);
    return (
      <span className={cn('truncate', className)} title={title ?? plain}>
        {plain}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'text-sm leading-relaxed text-foreground markdown-content',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        '[&_p]:my-1.5 [&_p]:leading-relaxed',
        '[&_ul]:list-disc [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:space-y-1',
        '[&_ol]:list-decimal [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:space-y-1',
        '[&_li]:leading-relaxed',
        '[&_strong]:font-semibold',
        '[&_em]:italic',
        '[&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1.5',
        '[&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1.5',
        '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/40 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
        '[&_hr]:my-3 [&_hr]:border-border',
        '[&_a]:text-primary [&_a]:underline hover:[&_a]:opacity-80',
        '[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse',
        '[&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold',
        '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs',
        className
      )}
      title={title}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          code: ({ node, ...props }) => {
            const inline = !('inline' in props) || (props as any).inline !== false;
            return inline ? (
              <code
                {...props}
                className="px-1 py-0.5 rounded text-[0.85em] font-mono bg-muted text-foreground"
              />
            ) : (
              <code
                {...props}
                className="block px-3 py-2 rounded-md text-xs font-mono bg-muted text-foreground overflow-x-auto leading-relaxed"
              />
            );
          },
          pre: ({ node, ...props }) => <pre {...props} className="my-2" />,
        }}
      >
        {message}
      </ReactMarkdown>
    </div>
  );
}
