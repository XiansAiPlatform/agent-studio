'use client';

import { Globe, Building2, Zap, ChevronRight, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface KnowledgeStatsCardsProps {
  systemCount: number;
  tenantCount: number;
  activationCount: number;
  agentName?: string;
  activationName?: string;
}

export function KnowledgeStatsCards({
  systemCount,
  tenantCount,
  activationCount,
  agentName,
  activationName,
}: KnowledgeStatsCardsProps) {
  const totalArticles = systemCount + tenantCount + activationCount;
  const agentLabel = agentName?.trim() || 'this agent';
  const activationLabel = activationName?.trim() || 'this activation';

  const stats: StatCardProps[] = [
    {
      count: systemCount,
      icon: Globe,
      title: 'Using System Default',
      description: `Inherited from the base definition of ${agentLabel}.`,
      tooltipTitle: 'System default',
      tooltipBody:
        'These articles use the base configuration shipped with the agent. They apply because no Organization or Agent override has been created yet.',
      isHighest: false,
    },
    {
      count: tenantCount,
      icon: Building2,
      title: 'Using Organization Override',
      description: `Customized for ${agentLabel} across this organization.`,
      tooltipTitle: 'Organization override',
      tooltipBody: `These articles override the system default for any activation of ${agentLabel} in this organization. They apply when no Agent Activation override exists.`,
      isHighest: false,
    },
    {
      count: activationCount,
      icon: Zap,
      title: 'Using Agent Override',
      description: `Specific to ${activationLabel} only.`,
      tooltipTitle: 'Agent activation override',
      tooltipBody: `These articles only apply to the ${activationLabel} activation. They take priority over both organization and system levels.`,
      isHighest: false,
    },
  ];

  const maxCount = Math.max(...stats.map((s) => s.count));
  if (maxCount > 0) {
    stats.forEach((s) => {
      s.isHighest = s.count === maxCount;
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card/40">
      <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Knowledge sources
            </h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="How knowledge overrides work"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium mb-1">How overrides work</p>
                  <p className="text-xs text-muted-foreground">
                    Each knowledge article can be defined at three levels.
                    More specific overrides take priority — Agent beats
                    Organization, Organization beats System.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Where each of {totalArticles} article{totalArticles === 1 ? '' : 's'}{' '}
            is sourced from for {activationLabel}.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/80 shrink-0 pt-0.5">
          More specific overrides win
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="hidden sm:flex items-stretch gap-3">
          {stats.map((stat, idx) => (
            <div key={stat.title} className="flex items-stretch flex-1 min-w-0">
              <StatCard {...stat} />
              {idx < stats.length - 1 && (
                <div
                  className="flex items-center justify-center px-1 sm:px-2 shrink-0"
                  aria-hidden="true"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="sm:hidden flex flex-col divide-y divide-border/40">
          {stats.map((stat, idx) => (
            <div
              key={stat.title}
              className={cn(
                'flex items-center gap-3 py-2.5',
                idx === 0 && 'pt-0',
                idx === stats.length - 1 && 'pb-0'
              )}
            >
              <StatCardCompact {...stat} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tooltipTitle: string;
  tooltipBody: string;
  isHighest: boolean;
}

function StatCard({
  count,
  icon: Icon,
  title,
  description,
  tooltipTitle,
  tooltipBody,
  isHighest,
}: StatCardProps) {
  const isEmpty = count === 0;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex-1 min-w-0 rounded-md px-3 py-3 transition-colors cursor-default border',
              isEmpty
                ? 'border-dashed border-border/60 bg-muted/20'
                : isHighest
                ? 'border-primary/30 bg-primary/5'
                : 'border-border/60 bg-background'
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full shrink-0',
                  isEmpty
                    ? 'bg-muted/50'
                    : isHighest
                    ? 'bg-primary/15'
                    : 'bg-muted'
                )}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5',
                    isEmpty
                      ? 'text-muted-foreground/50'
                      : isHighest
                      ? 'text-primary'
                      : 'text-foreground'
                  )}
                />
              </span>
              <span
                className={cn(
                  'text-3xl font-light tabular-nums leading-none',
                  isEmpty ? 'text-muted-foreground/60' : 'text-foreground'
                )}
              >
                {count}
              </span>
            </div>
            <p
              className={cn(
                'text-sm font-medium leading-snug',
                isEmpty ? 'text-muted-foreground/70' : 'text-foreground'
              )}
            >
              {title}
            </p>
            <p
              className={cn(
                'text-xs leading-snug mt-0.5',
                isEmpty ? 'text-muted-foreground/60' : 'text-muted-foreground'
              )}
            >
              {description}
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium mb-1">{tooltipTitle}</p>
          <p className="text-xs text-muted-foreground">{tooltipBody}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StatCardCompact({
  count,
  icon: Icon,
  title,
  description,
  isHighest,
}: StatCardProps) {
  const isEmpty = count === 0;
  return (
    <>
      <span
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full shrink-0',
          isEmpty
            ? 'bg-muted/40 border border-dashed border-muted-foreground/30'
            : isHighest
            ? 'bg-primary/15'
            : 'bg-muted'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4',
            isEmpty
              ? 'text-muted-foreground/50'
              : isHighest
              ? 'text-primary'
              : 'text-foreground'
          )}
        />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm font-medium leading-tight truncate',
              isEmpty ? 'text-muted-foreground/70' : 'text-foreground'
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              'text-xl font-light tabular-nums leading-none shrink-0',
              isEmpty ? 'text-muted-foreground/60' : 'text-foreground'
            )}
          >
            {count}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-snug mt-0.5 truncate">
          {description}
        </p>
      </div>
    </>
  );
}
