'use client';

import { createContext, useContext, useMemo, useState, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { cva } from 'class-variance-authority';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MarkdownVariant = 'user' | 'agent';

const textVariants = cva('', {
  variants: { variant: { user: 'text-primary-foreground', agent: 'text-foreground' } },
});

const mutedTextVariants = cva('', {
  variants: { variant: { user: 'text-primary-foreground/90', agent: 'text-muted-foreground' } },
});

const blockquoteBorderVariants = cva('', {
  variants: { variant: { user: 'border-primary-foreground/40', agent: 'border-muted-foreground/40' } },
});

const hrVariants = cva('', {
  variants: { variant: { user: 'border-primary-foreground/30', agent: 'border-muted-foreground/30' } },
});

const tableBorderVariants = cva('', {
  variants: { variant: { user: 'border-primary-foreground/30', agent: 'border-border' } },
});

const tableHeaderBgVariants = cva('', {
  variants: { variant: { user: 'bg-primary-foreground/10', agent: 'bg-muted/50' } },
});

const codeBgVariants = cva('', {
  variants: { variant: { user: 'bg-primary-foreground/20', agent: 'bg-muted-foreground/20' } },
});

const linkVariants = cva('underline hover:opacity-80 transition-opacity', {
  variants: { variant: { user: 'text-primary-foreground', agent: 'text-primary' } },
});

/**
 * Block code is structurally always `pre > code`; inline code never is. Set by the
 * `pre` override so `code` can tell them apart without relying on react-markdown's
 * removed (pre-v6) `inline` prop.
 */
const CodeBlockContext = createContext(false);

function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { type?: string; value?: string; children?: unknown[] };
  if (n.type === 'text' && typeof n.value === 'string') return n.value;
  if (Array.isArray(n.children)) return n.children.map(extractText).join('');
  return '';
}

function CopyCodeButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the button
      // still gives feedback so the user knows the click registered.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/90 px-2 py-1',
        'text-[11px] font-medium text-muted-foreground opacity-0 transition-opacity',
        'group-hover/code:opacity-100 focus-visible:opacity-100 hover:text-foreground',
        copied && 'opacity-100 text-primary'
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/** Named (capitalized) so the react-hooks lint rule recognizes it as a component that's allowed to call useContext. */
function PreBlock({ node, children, ...props }: ComponentPropsWithoutRef<'pre'> & { node?: unknown }) {
  return (
    <pre
      {...props}
      className="group/code relative my-3 max-w-full overflow-x-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
    >
      <CodeBlockContext.Provider value={true}>{children}</CodeBlockContext.Provider>
      <CopyCodeButton text={extractText(node)} />
    </pre>
  );
}

/** Named (capitalized) so the react-hooks lint rule recognizes it as a component that's allowed to call useContext. */
function CodeSpan({
  variant,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'code'> & { variant: MarkdownVariant }) {
  const isBlock = useContext(CodeBlockContext);
  return isBlock ? (
    <code
      {...props}
      className={cn(
        'block max-w-full px-4 py-3 rounded-md text-xs font-mono leading-relaxed',
        'whitespace-pre-wrap break-words [overflow-wrap:anywhere]',
        codeBgVariants({ variant }),
        className
      )}
    >
      {children}
    </code>
  ) : (
    <code
      {...props}
      className={cn(
        'px-1.5 py-0.5 rounded text-xs font-mono [overflow-wrap:anywhere] break-all',
        codeBgVariants({ variant }),
        className
      )}
    >
      {children}
    </code>
  );
}

function buildMarkdownComponents(variant: MarkdownVariant): Components {
  return {
    a: ({ node, ...props }) => (
      <a
        {...props}
        className={cn(linkVariants({ variant }), '[overflow-wrap:anywhere] break-words')}
        target="_blank"
        rel="noopener noreferrer"
      />
    ),
    pre: PreBlock,
    code: ({ node, ...props }) => <CodeSpan {...props} variant={variant} />,
    p: ({ node, ...props }) => (
      <p {...props} className={cn('my-2 leading-relaxed max-w-full [overflow-wrap:anywhere] break-words', textVariants({ variant }))} />
    ),
    ul: ({ node, ...props }) => (
      <ul
        {...props}
        className={cn('list-disc my-3 space-y-1.5 pl-6 marker:text-current max-w-full [&>li]:pl-1.5', textVariants({ variant }))}
      />
    ),
    ol: ({ node, ...props }) => (
      <ol
        {...props}
        className={cn('list-decimal my-3 space-y-1.5 pl-6 marker:text-current max-w-full [&>li]:pl-1.5', textVariants({ variant }))}
      />
    ),
    li: ({ node, ...props }) => (
      <li
        {...props}
        className={cn(
          'leading-relaxed [overflow-wrap:anywhere] break-words [&>ul]:mt-1.5 [&>ol]:mt-1.5 [&>ul]:mb-0 [&>ol]:mb-0',
          textVariants({ variant })
        )}
      />
    ),
    strong: ({ node, ...props }) => (
      <strong {...props} className={cn('font-bold', textVariants({ variant }))} />
    ),
    em: ({ node, ...props }) => (
      <em {...props} className={cn('italic', textVariants({ variant }))} />
    ),
    h1: ({ node, ...props }) => (
      <h1 {...props} className={cn('text-lg font-bold mt-4 mb-2 leading-tight [overflow-wrap:anywhere]', textVariants({ variant }))} />
    ),
    h2: ({ node, ...props }) => (
      <h2 {...props} className={cn('text-base font-bold mt-4 mb-2 leading-tight [overflow-wrap:anywhere]', textVariants({ variant }))} />
    ),
    h3: ({ node, ...props }) => (
      <h3 {...props} className={cn('text-sm font-bold mt-3 mb-1.5 leading-tight [overflow-wrap:anywhere]', textVariants({ variant }))} />
    ),
    blockquote: ({ node, ...props }) => (
      <blockquote
        {...props}
        className={cn(
          'border-l-3 pl-4 my-3 italic leading-relaxed max-w-full [overflow-wrap:anywhere]',
          blockquoteBorderVariants({ variant }),
          mutedTextVariants({ variant })
        )}
      />
    ),
    hr: ({ node, ...props }) => <hr {...props} className={cn('my-4', hrVariants({ variant }))} />,
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-3 max-w-full">
        <table {...props} className={cn('min-w-full border-collapse', textVariants({ variant }))} />
      </div>
    ),
    th: ({ node, ...props }) => (
      <th
        {...props}
        className={cn(
          'border px-3 py-2 text-left font-semibold text-sm [overflow-wrap:anywhere]',
          tableBorderVariants({ variant }),
          tableHeaderBgVariants({ variant })
        )}
      />
    ),
    td: ({ node, ...props }) => (
      <td {...props} className={cn('border px-3 py-2 text-sm [overflow-wrap:anywhere] break-words', tableBorderVariants({ variant }))} />
    ),
  };
}

interface MarkdownMessageProps {
  content: string;
  variant: MarkdownVariant;
}

export function MarkdownMessage({ content, variant }: MarkdownMessageProps) {
  const components = useMemo(() => buildMarkdownComponents(variant), [variant]);

  return (
    <div className="text-sm leading-relaxed markdown-content min-w-0 max-w-full [overflow-wrap:anywhere] break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
