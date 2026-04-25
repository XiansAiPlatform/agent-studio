'use client';

import { ArrowRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetricType } from '../types';
import { formatMetricValue, getUnitDisplay } from '../utils/format-helpers';
import { formatDistanceToNow } from 'date-fns';

interface MetricTypeItemProps {
  metricType: MetricType;
  category: string;
  showViewTimeline?: boolean;
  onViewDetails?: (type: string, category: string) => void;
}

interface StatCellProps {
  label: string;
  value: number | null;
  unit: string;
  emphasize?: boolean;
}

function StatCell({ label, value, unit, emphasize = false }: StatCellProps) {
  const unitDisplay = getUnitDisplay(unit);
  const valueClass = emphasize
    ? 'text-lg font-semibold text-foreground tabular-nums'
    : 'text-base font-semibold text-foreground tabular-nums';

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className={valueClass}>
        {value === null ? (
          <span className="text-muted-foreground/60 font-normal">—</span>
        ) : (
          <>
            {formatMetricValue(value, unit).value}
            {unitDisplay && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {unitDisplay}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function MetricTypeItem({
  metricType,
  category,
  showViewTimeline = false,
  onViewDetails,
}: MetricTypeItemProps) {
  const { stats } = metricType;
  const unitDisplay = getUnitDisplay(stats.unit);
  const headline = formatMetricValue(stats.sum, stats.unit);

  return (
    <div className="group p-5 rounded-xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all duration-200">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {metricType.type}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <span className="font-medium text-foreground">
                  {stats.count}
                </span>
                <span>samples</span>
              </div>
              <span className="text-muted-foreground/50">•</span>
              <span className="px-2 py-1 rounded-md bg-muted/30">
                {metricType.units.join(', ')}
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span className="flex items-center gap-1" suppressHydrationWarning>
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(metricType.lastSeen), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          {/* Headline metric: total/sum */}
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Total
            </div>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                {headline.value}
              </span>
              {unitDisplay && (
                <span className="text-sm font-medium text-muted-foreground">
                  {unitDisplay}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Statistics grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-3 py-3 px-4 rounded-lg bg-muted/30">
          <StatCell label="Average" value={stats.average} unit={stats.unit} emphasize />
          <StatCell label="Min" value={stats.min} unit={stats.unit} />
          <StatCell label="Max" value={stats.max} unit={stats.unit} />
          <StatCell label="Median" value={stats.median} unit={stats.unit} />
          <StatCell label="P95" value={stats.p95} unit={stats.unit} />
          <StatCell label="P99" value={stats.p99} unit={stats.unit} />
        </div>

        {/* Agents */}
        {metricType.agents.length > 0 && (
          <div className="space-y-2.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Agents
            </span>
            <div className="flex flex-wrap gap-2">
              {metricType.agents.map((agent) => (
                <Badge
                  key={agent}
                  variant="outline"
                  className="text-xs font-normal px-2.5 py-1 rounded-md"
                >
                  {agent}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* View Timeline Button */}
        {onViewDetails && showViewTimeline && (
          <div className="pt-3 mt-3 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(metricType.type, category)}
              className="h-9 gap-2 group hover:bg-primary hover:text-primary-foreground rounded-lg transition-all font-medium border-primary/20 hover:border-primary"
            >
              <span>View Timeline</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
