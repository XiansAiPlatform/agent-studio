'use client';

import {
  KnowledgeGroup,
  KnowledgeItem,
  KnowledgeScopeLevel,
  getEffectiveKnowledge,
} from '@/lib/xians/knowledge';
import { cn } from '@/lib/utils';
import { FileJson, FileText, FileCode, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { IconAvatar } from '@/components/ui/icon-avatar';
import { KnowledgeOverrideHierarchyCard } from './knowledge-override-hierarchy-card';

interface KnowledgeGroupItemProps {
  group: KnowledgeGroup;
  onClick: (group: KnowledgeGroup) => void;
  onItemClick?: (item: KnowledgeItem, level: KnowledgeScopeLevel) => void;
  isSelected?: boolean;
  agentName?: string;
  activationName?: string;
}

const formatConfig = {
  json: {
    icon: FileJson,
    variant: 'primary' as const,
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
  markdown: {
    icon: FileCode,
    variant: 'primary' as const,
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
  text: {
    icon: FileText,
    variant: 'primary' as const,
    badge: 'bg-primary/10 text-primary border-primary/20',
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

export function KnowledgeGroupItem({
  group,
  onClick,
  onItemClick,
  isSelected,
  agentName,
  activationName,
}: KnowledgeGroupItemProps) {
  const effectiveItem = getEffectiveKnowledge(group);

  if (!effectiveItem) {
    return null;
  }

  const config = formatConfig[effectiveItem.type] || formatConfig.text;

  return (
    <div
      onClick={() => onClick(group)}
      className={cn(
        'group relative py-4 px-4 sm:py-5 sm:px-6 cursor-pointer transition-all duration-200',
        'border-b border-border/40 last:border-b-0',
        'hover:bg-accent/5',
        isSelected && 'bg-accent/10',
        'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:transition-all before:duration-200',
        isSelected
          ? 'before:opacity-100 before:bg-primary'
          : 'before:opacity-0 before:bg-border'
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <IconAvatar
          icon={config.icon}
          variant={config.variant}
          size="md"
          className="mt-0.5 shrink-0"
        />

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-medium text-foreground leading-snug tracking-tight">
                {group.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={cn('text-xs font-medium', config.badge)}>
                {effectiveItem.type.toUpperCase()}
              </Badge>
            </div>
          </div>

          <KnowledgeOverrideHierarchyCard
            group={group}
            agentName={agentName ?? effectiveItem.agent}
            activationName={activationName}
            onViewLevel={onItemClick}
            showHeader={false}
          />

          <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground/70 flex-wrap">
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-none">
                {effectiveItem.agent}
              </span>
            </span>

            <span className="text-muted-foreground/30 hidden sm:inline">•</span>

            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {formatDate(effectiveItem.createdAt)}
            </span>

            <span className="text-muted-foreground/30 hidden sm:inline">•</span>

            <span className="font-mono text-[10px]">
              {effectiveItem.version.slice(0, 8)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
