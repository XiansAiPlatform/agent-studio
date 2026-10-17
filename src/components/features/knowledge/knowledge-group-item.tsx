'use client';

import {
  KnowledgeGroup,
  KnowledgeItem,
  KnowledgeScopeLevel,
  SCOPE_LEVEL_CONFIG,
  getEffectiveKnowledge,
  getEffectiveScopeLevel,
} from '@/lib/xians/knowledge';
import { cn } from '@/lib/utils';
import {
  FileJson,
  FileText,
  FileCode,
  Clock,
  User,
  ChevronRight,
  Globe,
  Building2,
  Zap,
  PanelRightOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KnowledgeOverrideHierarchyCard } from './knowledge-override-hierarchy-card';

interface KnowledgeGroupItemProps {
  group: KnowledgeGroup;
  onClick: (group: KnowledgeGroup) => void;
  onItemClick?: (item: KnowledgeItem, level: KnowledgeScopeLevel) => void;
  isSelected?: boolean;
  isExpanded?: boolean;
  onToggle?: (group: KnowledgeGroup) => void;
  agentName?: string;
  activationName?: string;
}

const formatIcons = {
  json: FileJson,
  markdown: FileCode,
  text: FileText,
};

const scopeIcons = {
  system: Globe,
  tenant: Building2,
  activation: Zap,
};

const SCOPE_ORDER: KnowledgeScopeLevel[] = ['system', 'tenant', 'activation'];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'just now';
  if (diffHours < 1) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function getLevelItem(group: KnowledgeGroup, level: KnowledgeScopeLevel): KnowledgeItem | null {
  if (level === 'system') return group.system_scoped;
  if (level === 'tenant') return group.tenant_default;
  return group.activations[0] ?? null;
}

function ScopeTrail({ group }: { group: KnowledgeGroup }) {
  const effectiveLevel = getEffectiveScopeLevel(group);

  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {SCOPE_ORDER.map((level, index) => {
        const Icon = scopeIcons[level];
        const exists = !!getLevelItem(group, level);
        const isActive = level === effectiveLevel;
        const label = SCOPE_LEVEL_CONFIG[level].label;
        return (
          <div key={level} className="flex items-center gap-0.5">
            {index > 0 && (
              <span
                className={cn(
                  'h-px w-2',
                  exists ? 'bg-muted-foreground/40' : 'bg-muted-foreground/15'
                )}
              />
            )}
            <span
              title={`${label}: ${isActive ? 'active' : exists ? 'overridden' : 'not configured'}`}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full',
                isActive && 'bg-primary text-primary-foreground',
                exists && !isActive && 'bg-muted text-muted-foreground',
                !exists && 'border border-dashed border-muted-foreground/25 text-muted-foreground/30'
              )}
            >
              <Icon className="h-2.5 w-2.5" />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function KnowledgeGroupItem({
  group,
  onClick,
  onItemClick,
  isSelected,
  isExpanded = false,
  onToggle,
  agentName,
  activationName,
}: KnowledgeGroupItemProps) {
  const effectiveItem = getEffectiveKnowledge(group);

  if (!effectiveItem) {
    return null;
  }

  const FormatIcon = formatIcons[effectiveItem.type] ?? FileText;
  const effectiveLevel = getEffectiveScopeLevel(group);
  const ScopeIcon = scopeIcons[effectiveLevel];
  const panelId = `knowledge-group-${group.name.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return (
    <div
      className={cn(
        'relative border-b border-border/40 last:border-b-0 transition-colors',
        isExpanded && 'bg-accent/5',
        'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:transition-opacity',
        isSelected || isExpanded
          ? 'before:opacity-100 before:bg-primary'
          : 'before:opacity-0 before:bg-border'
      )}
    >
      <button
        type="button"
        onClick={() => onToggle?.(group)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className={cn(
          'group flex w-full items-center gap-3 px-4 py-2.5 sm:px-6 text-left cursor-pointer',
          'hover:bg-accent/10 focus-visible:outline-none focus-visible:bg-accent/10',
          isSelected && 'bg-accent/10'
        )}
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200',
            isExpanded && 'rotate-90 text-foreground'
          )}
        />
        <FormatIcon className="h-4 w-4 shrink-0 text-primary" />

        <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">
          {group.name}
        </span>

        <span
          className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0"
          title={`${SCOPE_LEVEL_CONFIG[effectiveLevel].label} version is active`}
        >
          <ScopeIcon className="h-3 w-3" />
          {SCOPE_LEVEL_CONFIG[effectiveLevel].label}
        </span>

        <span className="hidden sm:block shrink-0">
          <ScopeTrail group={group} />
        </span>

        <Badge
          variant="outline"
          className="hidden sm:inline-flex h-5 px-1.5 text-[10px] font-medium bg-primary/10 text-primary border-primary/20 shrink-0"
        >
          {effectiveItem.type.toUpperCase()}
        </Badge>

        <span
          className="hidden lg:inline w-16 text-right text-xs text-muted-foreground/70 tabular-nums shrink-0"
          title={new Date(effectiveItem.createdAt).toLocaleString()}
        >
          {formatDate(effectiveItem.createdAt)}
        </span>
      </button>

      {isExpanded && (
        <div id={panelId} className="px-4 pb-4 sm:px-6 sm:pl-[3.75rem] space-y-3">
          <KnowledgeOverrideHierarchyCard
            group={group}
            agentName={agentName ?? effectiveItem.agent}
            activationName={activationName}
            onViewLevel={onItemClick}
            showHeader={false}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground/70 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[180px] sm:max-w-none">
                  {effectiveItem.agent}
                </span>
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {formatDate(effectiveItem.createdAt)}
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span className="font-mono text-[10px]">{effectiveItem.version.slice(0, 8)}</span>
            </div>

            <Button size="sm" variant="outline" onClick={() => onClick(group)}>
              <PanelRightOpen />
              Open active version
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
