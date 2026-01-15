'use client';

import { KnowledgeArticle } from '@/lib/data/dummy-knowledge';
import { FileJson, FileText, FileCode, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface KnowledgeListItemProps {
  article: KnowledgeArticle;
  onClick: (article: KnowledgeArticle) => void;
  isSelected?: boolean;
}

const formatIcons = {
  json: FileJson,
  markdown: FileCode,
  text: FileText,
};

const formatColors = {
  json: 'text-blue-600 dark:text-blue-400',
  markdown: 'text-purple-600 dark:text-purple-400',
  text: 'text-gray-600 dark:text-gray-400',
};

const formatBadgeColors = {
  json: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  markdown: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  text: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
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
  const FormatIcon = formatIcons[article.format];
  
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
      <div className="flex items-start justify-between gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Title and Format */}
          <div className="flex items-center gap-3">
            <FormatIcon className={cn('h-4 w-4 flex-shrink-0', formatColors[article.format])} />
            <h3 className="text-base font-medium text-foreground leading-snug tracking-tight">
              {article.title}
            </h3>
          </div>

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
          <Badge className={cn('text-xs font-medium', formatBadgeColors[article.format])}>
            {article.format.toUpperCase()}
          </Badge>
        </div>
      </div>
    </div>
  );
}
