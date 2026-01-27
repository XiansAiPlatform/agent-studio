'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  KnowledgeGroup,
  KnowledgeItem,
  getEffectiveKnowledge,
  getEffectiveScopeLevel,
  SCOPE_LEVEL_CONFIG,
} from '@/lib/xians/knowledge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  FileJson,
  FileText,
  FileCode,
  User,
  Clock,
  Edit,
  Copy,
  Trash2,
  Globe,
  Building2,
  Zap,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamically import the markdown editor to avoid SSR issues
const MDEditorMarkdown = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

interface KnowledgeGroupDetailProps {
  group: KnowledgeGroup;
  onEdit?: (item: KnowledgeItem) => void;
  onDuplicate?: (item: KnowledgeItem) => void;
  onDelete?: (itemId: string) => void;
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

const scopeIcons = {
  system: Globe,
  tenant: Building2,
  activation: Zap,
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ContentViewerProps {
  item: KnowledgeItem;
  mounted: boolean;
}

function ContentViewer({ item, mounted }: ContentViewerProps) {
  if (!mounted) {
    return (
      <div className="p-3 bg-muted/50 rounded-md">
        <p className="text-sm text-muted-foreground">Loading content...</p>
      </div>
    );
  }

  if (!item.content || item.content.trim() === '') {
    return (
      <div className="p-4 bg-muted/30 rounded-md border border-dashed border-muted-foreground/20">
        <p className="text-sm text-muted-foreground italic text-center">
          No content defined at this level
        </p>
      </div>
    );
  }

  switch (item.type) {
    case 'json':
      try {
        const parsed = JSON.parse(item.content);
        return (
          <div className="p-3 bg-muted/50 rounded-md overflow-x-auto max-h-[200px] overflow-y-auto">
            <pre className="text-xs text-foreground font-mono">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        );
      } catch {
        return (
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-destructive">Invalid JSON format</p>
            <pre className="mt-2 text-xs text-foreground font-mono whitespace-pre-wrap">
              {item.content}
            </pre>
          </div>
        );
      }

    case 'markdown':
      return (
        <div data-color-mode="auto" className="markdown-preview-compact">
          <div className="p-3 bg-muted/30 rounded-md max-h-[200px] overflow-auto text-xs">
            <MDEditorMarkdown
              source={item.content}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--foreground)',
              }}
            />
          </div>
        </div>
      );

    case 'text':
    default:
      return (
        <div className="p-3 bg-muted/50 rounded-md max-h-[200px] overflow-y-auto">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans">
            {item.content}
          </pre>
        </div>
      );
  }
}

interface ScopeLevelCardProps {
  level: 'system' | 'tenant' | 'activation';
  item: KnowledgeItem | null;
  isActive: boolean;
  mounted: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

function ScopeLevelCard({ level, item, isActive, mounted, isExpanded, onToggle }: ScopeLevelCardProps) {
  const config = SCOPE_LEVEL_CONFIG[level];
  const Icon = scopeIcons[level];

  return (
    <div className={cn(
      'rounded-lg border transition-all',
      isActive && [config.borderColor, 'border-2'],
      !isActive && item && 'border-dashed border-muted-foreground/30',
      !item && 'border-dashed border-muted-foreground/20 opacity-50'
    )}>
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        disabled={!item}
        className={cn(
          'w-full flex items-center justify-between p-3 text-left',
          item && 'hover:bg-muted/30 transition-colors',
          isActive && config.bgColor,
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', item ? config.color : 'text-muted-foreground/40')} />
          <span className={cn(
            'text-sm font-medium',
            item ? 'text-foreground' : 'text-muted-foreground/60'
          )}>
            {config.label}
          </span>
          {isActive && (
            <div className={cn(
              'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
              config.badgeColor
            )}>
              <Check className="w-3 h-3" />
              Active
            </div>
          )}
          {!isActive && item && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Overridden
            </span>
          )}
          {!item && (
            <span className="text-xs text-muted-foreground/50 italic">
              Not set
            </span>
          )}
        </div>
        {item && (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )
        )}
      </button>

      {/* Content - collapsible */}
      {item && isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50">
          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-3">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {item.createdBy}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(item.createdAt)}
            </span>
          </div>

          {/* Content Preview */}
          <ContentViewer item={item} mounted={mounted} />

          {/* Version */}
          <div className="text-xs text-muted-foreground font-mono">
            Version: {item.version.slice(0, 12)}...
          </div>
        </div>
      )}
    </div>
  );
}

export function KnowledgeGroupDetail({
  group,
  onEdit,
  onDuplicate,
  onDelete,
}: KnowledgeGroupDetailProps) {
  const [mounted, setMounted] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState<'system' | 'tenant' | 'activation' | null>(null);
  
  const effectiveItem = getEffectiveKnowledge(group);
  const effectiveLevel = getEffectiveScopeLevel(group);

  useEffect(() => {
    setMounted(true);
    // Auto-expand the active level
    setExpandedLevel(effectiveLevel);
  }, [effectiveLevel]);

  if (!effectiveItem) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No knowledge data available</p>
      </div>
    );
  }

  const FormatIcon = formatIcons[effectiveItem.type] || FileText;

  const toggleLevel = (level: 'system' | 'tenant' | 'activation') => {
    setExpandedLevel(expandedLevel === level ? null : level);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start gap-3 mb-3">
          <FormatIcon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', formatColors[effectiveItem.type])} />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground leading-tight">
              {group.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Knowledge configuration for {effectiveItem.agent}
            </p>
          </div>
        </div>
        
        {/* Compact metadata */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {effectiveItem.agent}
          </span>
          <span>•</span>
          <Badge variant="outline" className="text-xs h-5">
            {effectiveItem.type.toUpperCase()}
          </Badge>
          <span>•</span>
          <Badge 
            variant="outline" 
            className={cn('text-xs h-5', SCOPE_LEVEL_CONFIG[effectiveLevel].badgeColor)}
          >
            {SCOPE_LEVEL_CONFIG[effectiveLevel].label} Level
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Override Hierarchy Visualization */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          Configuration Hierarchy
          <span className="text-xs text-muted-foreground font-normal">
            (Click to expand)
          </span>
        </h3>
        
        {/* Visual hierarchy flow - horizontal */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg overflow-x-auto">
          <div className="flex items-center gap-1 text-xs shrink-0">
            <Globe className={cn(
              'w-4 h-4',
              group.system_scoped ? 'text-blue-500' : 'text-muted-foreground/30'
            )} />
            <span className={group.system_scoped ? 'text-foreground' : 'text-muted-foreground/50'}>
              System
            </span>
            {effectiveLevel === 'system' && (
              <Check className="w-3 h-3 text-blue-500" />
            )}
          </div>
          <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
          <div className="flex items-center gap-1 text-xs shrink-0">
            <Building2 className={cn(
              'w-4 h-4',
              group.tenant_default ? 'text-amber-500' : 'text-muted-foreground/30'
            )} />
            <span className={group.tenant_default ? 'text-foreground' : 'text-muted-foreground/50'}>
              Organization
            </span>
            {effectiveLevel === 'tenant' && (
              <Check className="w-3 h-3 text-amber-500" />
            )}
          </div>
          <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
          <div className="flex items-center gap-1 text-xs shrink-0">
            <Zap className={cn(
              'w-4 h-4',
              group.activations.length > 0 ? 'text-emerald-500' : 'text-muted-foreground/30'
            )} />
            <span className={group.activations.length > 0 ? 'text-foreground' : 'text-muted-foreground/50'}>
              Agent
            </span>
            {effectiveLevel === 'activation' && (
              <Check className="w-3 h-3 text-emerald-500" />
            )}
          </div>
        </div>

        {/* Collapsible level cards */}
        <div className="space-y-2">
          <ScopeLevelCard
            level="system"
            item={group.system_scoped}
            isActive={effectiveLevel === 'system'}
            mounted={mounted}
            isExpanded={expandedLevel === 'system'}
            onToggle={() => toggleLevel('system')}
          />
          <ScopeLevelCard
            level="tenant"
            item={group.tenant_default}
            isActive={effectiveLevel === 'tenant'}
            mounted={mounted}
            isExpanded={expandedLevel === 'tenant'}
            onToggle={() => toggleLevel('tenant')}
          />
          <ScopeLevelCard
            level="activation"
            item={group.activations.length > 0 ? group.activations[0] : null}
            isActive={effectiveLevel === 'activation'}
            mounted={mounted}
            isExpanded={expandedLevel === 'activation'}
            onToggle={() => toggleLevel('activation')}
          />
        </div>
      </div>

      {/* Actions */}
      <Separator />
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onDelete?.(effectiveItem.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onDuplicate?.(effectiveItem)}
        >
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </Button>
        <Button
          className="flex-1"
          onClick={() => onEdit?.(effectiveItem)}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>
    </div>
  );
}
