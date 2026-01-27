'use client';

import {
  KnowledgeGroup,
  KnowledgeItem,
  KnowledgeScopeLevel,
  getEffectiveKnowledge,
  getEffectiveScopeLevel,
  SCOPE_LEVEL_CONFIG,
} from '@/lib/xians/knowledge';
import { cn } from '@/lib/utils';
import { FileJson, FileText, FileCode, Clock, User, Globe, Building2, Zap, ChevronRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { IconAvatar } from '@/components/ui/icon-avatar';

interface KnowledgeGroupItemProps {
  group: KnowledgeGroup;
  onClick: (group: KnowledgeGroup) => void;
  onItemClick?: (item: KnowledgeItem, level: KnowledgeScopeLevel) => void;
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

export function KnowledgeGroupItem({ group, onClick, onItemClick, isSelected }: KnowledgeGroupItemProps) {
  const effectiveItem = getEffectiveKnowledge(group);
  const effectiveLevel = getEffectiveScopeLevel(group);
  const levelConfig = SCOPE_LEVEL_CONFIG[effectiveLevel];
  
  if (!effectiveItem) {
    return null;
  }

  const config = formatConfig[effectiveItem.type] || formatConfig.text;

  return (
    <div
      onClick={() => onClick(group)}
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
        <div className="flex-1 min-w-0 space-y-3">
          {/* Title and Override Chain */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-medium text-foreground leading-snug tracking-tight">
                {group.name}
              </h3>
              <Badge 
                variant="outline" 
                className={cn('text-xs font-medium', levelConfig.badgeColor)}
              >
                {levelConfig.label} Level
              </Badge>
            </div>
            
            {/* Format Badge */}
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={cn('text-xs font-medium', config.badge)}>
                {effectiveItem.type.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Override Chain Breadcrumb */}
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md overflow-x-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (group.system_scoped && onItemClick) {
                  onItemClick(group.system_scoped, 'system');
                }
              }}
              disabled={!group.system_scoped}
              className={cn(
                'flex items-center gap-1.5 text-xs shrink-0 px-2 py-1 rounded transition-colors',
                group.system_scoped && 'hover:bg-blue-500/10 cursor-pointer',
                !group.system_scoped && 'opacity-40 cursor-not-allowed'
              )}
            >
              <Globe className={cn(
                'w-3.5 h-3.5',
                group.system_scoped ? 'text-blue-500' : 'text-muted-foreground/30'
              )} />
              <span className={cn(
                'font-medium',
                group.system_scoped ? 'text-foreground' : 'text-muted-foreground/50'
              )}>
                System
              </span>
              {effectiveLevel === 'system' && (
                <Check className="w-3 h-3 text-blue-500" />
              )}
            </button>
            
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (group.tenant_default && onItemClick) {
                  onItemClick(group.tenant_default, 'tenant');
                }
              }}
              disabled={!group.tenant_default}
              className={cn(
                'flex items-center gap-1.5 text-xs shrink-0 px-2 py-1 rounded transition-colors',
                group.tenant_default && 'hover:bg-amber-500/10 cursor-pointer',
                !group.tenant_default && 'opacity-40 cursor-not-allowed'
              )}
            >
              <Building2 className={cn(
                'w-3.5 h-3.5',
                group.tenant_default ? 'text-amber-500' : 'text-muted-foreground/30'
              )} />
              <span className={cn(
                'font-medium',
                group.tenant_default ? 'text-foreground' : 'text-muted-foreground/50'
              )}>
                Organization
              </span>
              {effectiveLevel === 'tenant' && (
                <Check className="w-3 h-3 text-amber-500" />
              )}
            </button>
            
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                const activationItem = group.activations.length > 0 ? group.activations[0] : null;
                if (activationItem && onItemClick) {
                  onItemClick(activationItem, 'activation');
                }
              }}
              disabled={group.activations.length === 0}
              className={cn(
                'flex items-center gap-1.5 text-xs shrink-0 px-2 py-1 rounded transition-colors',
                group.activations.length > 0 && 'hover:bg-emerald-500/10 cursor-pointer',
                group.activations.length === 0 && 'opacity-40 cursor-not-allowed'
              )}
            >
              <Zap className={cn(
                'w-3.5 h-3.5',
                group.activations.length > 0 ? 'text-emerald-500' : 'text-muted-foreground/30'
              )} />
              <span className={cn(
                'font-medium',
                group.activations.length > 0 ? 'text-foreground' : 'text-muted-foreground/50'
              )}>
                Agent
              </span>
              {effectiveLevel === 'activation' && (
                <Check className="w-3 h-3 text-emerald-500" />
              )}
            </button>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {effectiveItem.agent}
            </span>
            
            <span className="text-muted-foreground/30">•</span>
            
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {formatDate(effectiveItem.createdAt)}
            </span>

            <span className="text-muted-foreground/30">•</span>
            
            <span className="font-mono text-[10px]">
              {effectiveItem.version.slice(0, 8)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
