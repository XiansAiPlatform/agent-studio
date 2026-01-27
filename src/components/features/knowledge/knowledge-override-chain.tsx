'use client';

import {
  KnowledgeGroup,
  KnowledgeItem,
  KnowledgeScopeLevel,
  getEffectiveScopeLevel,
  SCOPE_LEVEL_CONFIG,
} from '@/lib/xians/knowledge';
import { cn } from '@/lib/utils';
import { Globe, Building2, Zap, ChevronDown, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface KnowledgeOverrideChainProps {
  group: KnowledgeGroup;
  compact?: boolean;
  onItemClick?: (item: KnowledgeItem, level: KnowledgeScopeLevel) => void;
}

const scopeIcons = {
  system: Globe,
  tenant: Building2,
  activation: Zap,
};

interface ScopeNodeProps {
  level: KnowledgeScopeLevel;
  item: KnowledgeItem | null;
  isActive: boolean;
  isOverridden: boolean;
  showConnector?: boolean;
  compact?: boolean;
  onItemClick?: (item: KnowledgeItem, level: KnowledgeScopeLevel) => void;
}

function ScopeNode({ level, item, isActive, isOverridden, showConnector = true, compact = false, onItemClick }: ScopeNodeProps) {
  const Icon = scopeIcons[level];
  const config = SCOPE_LEVEL_CONFIG[level];
  const exists = item !== null;

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent parent row click
                  if (item) {
                    onItemClick?.(item, level);
                  }
                }}
                disabled={!item}
                className={cn(
                  'relative flex items-center justify-center w-7 h-7 rounded-full transition-all',
                  exists && 'cursor-pointer hover:scale-110',
                  !exists && 'cursor-not-allowed',
                  exists && isActive && !isOverridden && [
                    config.bgColor,
                    config.borderColor,
                    'border-2',
                    'ring-2 ring-offset-2 ring-offset-background',
                    level === 'system' && 'ring-blue-500/30',
                    level === 'tenant' && 'ring-amber-500/30',
                    level === 'activation' && 'ring-emerald-500/30',
                  ],
                  exists && isOverridden && [
                    'bg-muted/50',
                    'border border-dashed border-muted-foreground/30',
                  ],
                  !exists && [
                    'bg-muted/20',
                    'border border-dashed border-muted-foreground/20',
                  ]
                )}
                title={exists ? `Click to view ${config.label} level` : undefined}
              >
                <Icon
                  className={cn(
                    'w-3.5 h-3.5',
                    exists && isActive && !isOverridden && config.color,
                    exists && isOverridden && 'text-muted-foreground/50',
                    !exists && 'text-muted-foreground/30'
                  )}
                />
                {exists && isActive && !isOverridden && (
                  <div className="absolute -top-0.5 -right-0.5">
                    <div className={cn(
                      'w-3 h-3 rounded-full flex items-center justify-center',
                      level === 'system' && 'bg-blue-500',
                      level === 'tenant' && 'bg-amber-500',
                      level === 'activation' && 'bg-emerald-500',
                    )}>
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                <div className="font-medium">{config.label}</div>
                <div className="text-xs text-muted-foreground">{config.description}</div>
                {exists && (
                  <div className="text-xs mt-2 pt-2 border-t border-border">
                    {isActive && !isOverridden ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Active - This is the effective configuration
                      </span>
                    ) : isOverridden ? (
                      <span className="text-muted-foreground">
                        Overridden by {level === 'system' ? 'organization or agent' : 'agent'} level
                      </span>
                    ) : null}
                  </div>
                )}
                {!exists && (
                  <div className="text-xs text-muted-foreground">
                    No configuration at this level
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
          {showConnector && (
            <div className="flex items-center px-1">
              <ChevronDown className={cn(
                'w-3 h-3 -rotate-90',
                isOverridden || !exists ? 'text-muted-foreground/30' : 'text-muted-foreground/50'
              )} />
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-start gap-3">
      {/* Vertical connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full transition-all',
            exists && isActive && !isOverridden && [
              config.bgColor,
              config.borderColor,
              'border-2',
              'shadow-sm',
            ],
            exists && isOverridden && [
              'bg-muted/50',
              'border-2 border-dashed border-muted-foreground/30',
            ],
            !exists && [
              'bg-muted/20',
              'border-2 border-dashed border-muted-foreground/20',
            ]
          )}
        >
          <Icon
            className={cn(
              'w-5 h-5',
              exists && isActive && !isOverridden && config.color,
              exists && isOverridden && 'text-muted-foreground/50',
              !exists && 'text-muted-foreground/30'
            )}
          />
        </div>
        {showConnector && (
          <div className={cn(
            'w-0.5 h-6 mt-1',
            isOverridden || !exists ? 'bg-muted-foreground/20' : 'bg-muted-foreground/30'
          )} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pt-1.5">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium',
            exists && isActive && !isOverridden && 'text-foreground',
            (isOverridden || !exists) && 'text-muted-foreground'
          )}>
            {config.label}
          </span>
          {exists && isActive && !isOverridden && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              config.badgeColor
            )}>
              Active
            </span>
          )}
          {exists && isOverridden && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Overridden
            </span>
          )}
          {!exists && (
            <span className="text-xs text-muted-foreground/60 italic">
              Not set
            </span>
          )}
        </div>
        {exists && (
          <div className={cn(
            'text-xs mt-0.5',
            isOverridden ? 'text-muted-foreground/60 line-through' : 'text-muted-foreground'
          )}>
            v{item.version.slice(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
}

export function KnowledgeOverrideChain({ group, compact = false, onItemClick }: KnowledgeOverrideChainProps) {
  const effectiveLevel = getEffectiveScopeLevel(group);

  const systemItem = group.system_scoped;
  const tenantItem = group.tenant_default;
  const activationItem = group.activations.length > 0 ? group.activations[0] : null;

  const systemIsOverridden = systemItem && (tenantItem || activationItem);
  const tenantIsOverridden = tenantItem && activationItem;

  if (compact) {
    return (
      <div className="flex items-center">
        <ScopeNode
          level="system"
          item={systemItem}
          isActive={effectiveLevel === 'system'}
          isOverridden={!!systemIsOverridden}
          showConnector={true}
          compact={true}
          onItemClick={onItemClick}
        />
        <ScopeNode
          level="tenant"
          item={tenantItem}
          isActive={effectiveLevel === 'tenant'}
          isOverridden={!!tenantIsOverridden}
          showConnector={true}
          compact={true}
          onItemClick={onItemClick}
        />
        <ScopeNode
          level="activation"
          item={activationItem}
          isActive={effectiveLevel === 'activation'}
          isOverridden={false}
          showConnector={false}
          compact={true}
          onItemClick={onItemClick}
        />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <ScopeNode
        level="system"
        item={systemItem}
        isActive={effectiveLevel === 'system'}
        isOverridden={!!systemIsOverridden}
        showConnector={true}
      />
      <ScopeNode
        level="tenant"
        item={tenantItem}
        isActive={effectiveLevel === 'tenant'}
        isOverridden={!!tenantIsOverridden}
        showConnector={true}
      />
      <ScopeNode
        level="activation"
        item={activationItem}
        isActive={effectiveLevel === 'activation'}
        isOverridden={false}
        showConnector={false}
      />
    </div>
  );
}
