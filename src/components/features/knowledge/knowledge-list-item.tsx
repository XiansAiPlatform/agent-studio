'use client';

import { KnowledgeArticle } from '@/lib/data/dummy-knowledge';
import { FileJson, FileText, FileCode, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { IconAvatar } from '@/components/ui/icon-avatar';

interface KnowledgeListItemProps {
  article: KnowledgeArticle;
  onClick: (article: KnowledgeArticle) => void;
  isSelected?: boolean;
}

const formatConfig = {
  json: {
    icon: FileJson,
    variant: 'json' as const,
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
  markdown: {
    icon: FileCode,
    variant: 'markdown' as const,
    badge: 'bg-accent/10 text-accent border-accent/20',
  },
  text: {
    icon: FileText,
    variant: 'text' as const,
    badge: 'bg-muted text-muted-foreground border-border',
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months}mo ago`;
}

export function KnowledgeListItem({ article, onClick, isSelected }: KnowledgeListItemProps) {
  const config = formatConfig[article.format];
  
  return (
    <div
      onClick={() => onClick(article)}
      className={cn(
        'group relative py-5 px-6 cursor-pointer transition-all duration-200',
        'border-b border-border/40 last:border-b-0',
        'hover:bg-accent/5',
        isSelected && 'bg-accent/10',
        'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:transition-all before:duration-200',
        isSelected 
          ? 'before:opacity-100 before:bg-primary'
          : 'before:opacity-0 before:bg-border'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Format Icon with Circle Background */}
        <IconAvatar
          icon={config.icon}
          variant={config.variant}
          size="md"
          className="mt-0.5"
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-6">
          <div className="flex-1 space-y-3 min-w-0">
            {/* Title */}
            <h3 className="text-base font-medium text-foreground leading-snug tracking-tight">
              {article.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-2">
              {article.description}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3 w-3" />
                {article.assignedAgent.name}
              </span>
              
              <span className="text-muted-foreground/30">•</span>
              
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Updated {formatDate(article.updatedAt)}
              </span>

              <span className="text-muted-foreground/30">•</span>
              
              <span>v{article.version}</span>
            </div>
          </div>

          {/* Format Badge */}
          <div className="shrink-0 pt-0.5">
            <Badge variant="outline" className={cn('text-xs font-medium', config.badge)}>
              {article.format.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
