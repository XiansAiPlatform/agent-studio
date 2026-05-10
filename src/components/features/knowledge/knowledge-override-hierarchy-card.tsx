'use client';

import {
  KnowledgeGroup,
  KnowledgeItem,
  KnowledgeScopeLevel,
  SCOPE_LEVEL_CONFIG,
  getEffectiveScopeLevel,
} from '@/lib/xians/knowledge';
import { cn } from '@/lib/utils';
import {
  Globe,
  Building2,
  Zap,
  ChevronRight,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';

const scopeIcons = {
  system: Globe,
  tenant: Building2,
  activation: Zap,
};

interface HierarchyStepProps {
  level: KnowledgeScopeLevel;
  item: KnowledgeItem | null;
  isCurrent: boolean;
  isActive: boolean;
  isOverridden: boolean;
  onClick?: () => void;
}

function HierarchyStep({
  level,
  item,
  isCurrent,
  isActive,
  isOverridden,
  onClick,
}: HierarchyStepProps) {
  const Icon = scopeIcons[level];
  const config = SCOPE_LEVEL_CONFIG[level];
  const exists = item !== null;
  const canClick = exists && !isCurrent && !!onClick;

  let stateLabel: string;
  let stateClass: string;
  if (!exists) {
    stateLabel = 'Not configured';
    stateClass = 'text-muted-foreground/50';
  } else if (isCurrent) {
    stateLabel = 'You are here';
    stateClass = 'text-primary font-medium';
  } else if (isActive) {
    stateLabel = 'Active';
    stateClass = 'text-primary font-medium';
  } else if (isOverridden) {
    stateLabel = 'Overridden';
    stateClass = 'text-muted-foreground line-through';
  } else {
    stateLabel = 'Configured';
    stateClass = 'text-muted-foreground';
  }

  return (
    <button
      type="button"
      onClick={
        canClick
          ? (e) => {
              e.stopPropagation();
              onClick?.();
            }
          : undefined
      }
      disabled={!canClick}
      title={
        canClick
          ? `View ${config.label.toLowerCase()} level`
          : !exists
          ? `No configuration at ${config.label.toLowerCase()} level`
          : isCurrent
          ? `Currently viewing ${config.label.toLowerCase()} level`
          : undefined
      }
      className={cn(
        'group flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all shrink-0 min-w-0',
        canClick && 'cursor-pointer hover:bg-primary/10',
        !canClick && 'cursor-default',
        isCurrent && 'bg-primary/10 ring-1 ring-primary/40'
      )}
    >
      <div
        className={cn(
          'relative flex items-center justify-center h-7 w-7 rounded-full shrink-0',
          exists && isActive && 'bg-primary/15',
          exists && !isActive && !isOverridden && 'bg-muted',
          exists && isOverridden && 'bg-muted/60 border border-dashed border-muted-foreground/40',
          !exists && 'bg-muted/30 border border-dashed border-muted-foreground/30'
        )}
      >
        <Icon
          className={cn(
            'h-3.5 w-3.5',
            exists && isActive && 'text-primary',
            exists && !isActive && !isOverridden && 'text-foreground',
            exists && isOverridden && 'text-muted-foreground/70',
            !exists && 'text-muted-foreground/40'
          )}
        />
        {isActive && exists && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary">
            <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="flex flex-col items-start min-w-0">
        <span
          className={cn(
            'text-xs font-medium leading-tight',
            exists ? 'text-foreground' : 'text-muted-foreground/60'
          )}
        >
          {config.label}
        </span>
        <span className={cn('text-[10px] leading-tight', stateClass)}>{stateLabel}</span>
      </div>
    </button>
  );
}

interface KnowledgeOverrideHierarchyCardProps {
  group: KnowledgeGroup;
  /**
   * If provided, highlights a specific level as "currently being viewed".
   * Used in detail views. Omit when rendering inside a list row.
   */
  currentLevel?: KnowledgeScopeLevel;
  agentName?: string;
  activationName?: string;
  onViewLevel?: (item: KnowledgeItem, level: KnowledgeScopeLevel) => void;
  className?: string;
  showHeader?: boolean;
}

export function KnowledgeOverrideHierarchyCard({
  group,
  currentLevel,
  agentName,
  activationName,
  onViewLevel,
  className,
  showHeader = true,
}: KnowledgeOverrideHierarchyCardProps) {
  const effectiveLevel = getEffectiveScopeLevel(group);

  const systemItem = group.system_scoped;
  const tenantItem = group.tenant_default;
  const activationItem = group.activations.length > 0 ? group.activations[0] : null;

  const systemOverridden = !!systemItem && (!!tenantItem || !!activationItem);
  const tenantOverridden = !!tenantItem && !!activationItem;

  const agentLabel = agentName?.trim() || 'this agent';
  const activationLabel = activationName?.trim() || 'this activation';

  let banner: { tone: 'active' | 'overridden'; title: string; description: string };

  // When no currentLevel is provided, the banner describes what's active for the
  // group as a whole (used in list rows). When currentLevel is provided, the
  // banner describes the relationship between what's being viewed and what's active.
  if (!currentLevel || currentLevel === effectiveLevel) {
    if (effectiveLevel === 'system') {
      banner = {
        tone: 'active',
        title: 'System default in effect',
        description: `Applies to ${activationLabel} because no Organization or Agent override exists yet.`,
      };
    } else if (effectiveLevel === 'tenant') {
      banner = {
        tone: 'active',
        title: 'Organization override in effect',
        description: `Replaces the system default for any activation of ${agentLabel}, including ${activationLabel}.`,
      };
    } else {
      banner = {
        tone: 'active',
        title: 'Agent activation override in effect',
        description: `Only applies to ${activationLabel} of ${agentLabel}, replacing any system or organization defaults.`,
      };
    }
  } else {
    if (currentLevel === 'system') {
      banner = {
        tone: 'overridden',
        title: 'This system default is overridden',
        description:
          effectiveLevel === 'tenant'
            ? `An Organization override is being used for ${activationLabel}. Open the Organization step to view what is actually active.`
            : `An Agent override is being used for ${activationLabel}. Open the Agent step to view what is actually active.`,
      };
    } else if (currentLevel === 'tenant') {
      banner = {
        tone: 'overridden',
        title: 'This organization override is overridden',
        description: `An Agent Activation override on ${activationLabel} replaces it. Open the Agent step to view what is actually active.`,
      };
    } else {
      banner = {
        tone: 'overridden',
        title: 'This agent activation override is not active',
        description: 'Something looks off — this level is showing but is not currently effective.',
      };
    }
  }

  const handleStepClick = (item: KnowledgeItem | null, lvl: KnowledgeScopeLevel) => {
    if (item && onViewLevel) {
      onViewLevel(item, lvl);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card/40 overflow-hidden',
        className
      )}
    >
      {showHeader && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2 min-w-0">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-foreground">
              Override hierarchy
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
            More specific overrides win
          </span>
        </div>
      )}

      <div className="px-3 py-3">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <HierarchyStep
            level="system"
            item={systemItem}
            isCurrent={currentLevel === 'system'}
            isActive={effectiveLevel === 'system'}
            isOverridden={systemOverridden}
            onClick={() => handleStepClick(systemItem, 'system')}
          />
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          <HierarchyStep
            level="tenant"
            item={tenantItem}
            isCurrent={currentLevel === 'tenant'}
            isActive={effectiveLevel === 'tenant'}
            isOverridden={tenantOverridden}
            onClick={() => handleStepClick(tenantItem, 'tenant')}
          />
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          <HierarchyStep
            level="activation"
            item={activationItem}
            isCurrent={currentLevel === 'activation'}
            isActive={effectiveLevel === 'activation'}
            isOverridden={false}
            onClick={() => handleStepClick(activationItem, 'activation')}
          />
        </div>

        <div
          className={cn(
            'mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs',
            banner.tone === 'active'
              ? 'bg-primary/10 text-foreground border border-primary/20'
              : 'bg-amber-500/10 text-foreground border border-amber-500/20'
          )}
        >
          {banner.tone === 'active' ? (
            <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" strokeWidth={3} />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-medium leading-snug">{banner.title}</p>
            <p className="text-muted-foreground leading-snug mt-0.5">
              {banner.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
