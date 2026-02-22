'use client';

import { ArrowRight, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetricType, MetricStats } from '../types';
import { formatMetricValue, getUnitDisplay } from '../utils/format-helpers';
import { formatDistanceToNow } from 'date-fns';

interface MetricTypeItemProps {
  metricType: MetricType;
  onViewDetails?: (type: string, category: string) => void;
  category: string;
  stats?: MetricStats | null;
  activationNames?: string[];
  isLoadingStats?: boolean;
  showViewTimeline?: boolean;
}

export function MetricTypeItem({ 
  metricType, 
  onViewDetails, 
  category,
  stats,
  activationNames,
  isLoadingStats,
  showViewTimeline = false
}: MetricTypeItemProps) {
  const formatted = formatMetricValue(metricType.sampleValue, metricType.units[0]);
  const unitDisplay = getUnitDisplay(metricType.units[0]);

  return (
    <div className="group p-5 rounded-xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all duration-200">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {metricType.type}
            </h4>
            {/* Sample value - primary focus */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                {formatted.value}
              </span>
              {unitDisplay && (
                <span className="text-sm font-medium text-muted-foreground">
                  {unitDisplay}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <span className="font-medium text-foreground">{metricType.sampleCount}</span>
                <span>samples</span>
              </div>
              <span className="text-muted-foreground/50">•</span>
              <span className="px-2 py-1 rounded-md bg-muted/30">{metricType.units.join(', ')}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="flex items-center gap-1" suppressHydrationWarning>
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(metricType.lastSeen), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {isLoadingStats ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading statistics...</span>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-3 px-4 rounded-lg bg-muted/30">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Average</div>
              <div className="text-base font-semibold text-foreground tabular-nums">
                {formatMetricValue(stats.average, stats.unit).value}
                {getUnitDisplay(stats.unit) && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {getUnitDisplay(stats.unit)}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Median</div>
              <div className="text-base font-semibold text-foreground tabular-nums">
                {stats.median !== null 
                  ? formatMetricValue(stats.median, stats.unit).value
                  : 'N/A'
                }
                {stats.median !== null && getUnitDisplay(stats.unit) && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {getUnitDisplay(stats.unit)}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Min</div>
              <div className="text-base font-semibold text-foreground tabular-nums">
                {formatMetricValue(stats.min, stats.unit).value}
                {getUnitDisplay(stats.unit) && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {getUnitDisplay(stats.unit)}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max</div>
              <div className="text-base font-semibold text-foreground tabular-nums">
                {formatMetricValue(stats.max, stats.unit).value}
                {getUnitDisplay(stats.unit) && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {getUnitDisplay(stats.unit)}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">P95</div>
              <div className="text-base font-semibold text-foreground tabular-nums">
                {stats.p95 !== null 
                  ? formatMetricValue(stats.p95, stats.unit).value
                  : 'N/A'
                }
                {stats.p95 !== null && getUnitDisplay(stats.unit) && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {getUnitDisplay(stats.unit)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null}


        {/* Activations */}
        <div className="space-y-2.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {activationNames && activationNames.length > 0 ? 'Activations' : 'Agents'}
          </span>
          <div className="flex flex-wrap gap-2">
            {activationNames && activationNames.length > 0 ? (
              activationNames.map((activation) => (
                <Badge key={activation} variant="outline" className="text-xs font-normal px-2.5 py-1 rounded-md">
                  {activation}
                </Badge>
              ))
            ) : (
              metricType.agents.map((agent) => (
                <Badge key={agent} variant="outline" className="text-xs font-normal px-2.5 py-1 rounded-md">
                  {agent}
                </Badge>
              ))
            )}
          </div>
        </div>

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
