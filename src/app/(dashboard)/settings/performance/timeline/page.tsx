'use client';

import { Suspense, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, ArrowLeft, BarChart3, TrendingUp, Activity, Zap, MinusSquare, PlusSquare, Target } from 'lucide-react';
import { useMetricsTimeseries } from '../hooks/use-metrics-timeseries';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { formatMetricValue, getUnitDisplay } from '../utils/format-helpers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

function TimelineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenantId } = useTenant();
  const { user } = useAuth();

  // Get params from URL
  const category = searchParams.get('category') || '';
  const type = searchParams.get('type') || '';
  const agentName = searchParams.get('agent');
  const activationName = searchParams.get('activation');
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  
  const [groupBy, setGroupBy] = useState<string>(searchParams.get('groupBy') || 'day');

  const shouldFetch = Boolean(currentTenantId) && Boolean(user) && Boolean(category) && Boolean(type);

  const { data, isLoading, error } = useMetricsTimeseries(
    currentTenantId,
    category,
    type,
    startDate,
    endDate,
    agentName,
    activationName,
    groupBy,
    shouldFetch
  );

  const handleGroupByChange = (value: string) => {
    setGroupBy(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('groupBy', value);
    router.push(`/settings/performance/timeline?${params.toString()}`, { scroll: false });
  };

  // Format chart data
  const chartData = data?.dataPoints.map((point) => ({
    timestamp: point.timestamp,
    value: point.value,
    count: point.count,
    formattedDate: format(new Date(point.timestamp), groupBy === 'week' ? 'MMM d' : groupBy === 'month' ? 'MMM yyyy' : 'MMM d'),
  })) || [];

  const unit = data?.metric.unit || '';
  const unitDisplay = getUnitDisplay(unit);

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="shrink-0 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  {type}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="font-normal">
                  {category}
                </Badge>
                {agentName && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{agentName}</span>
                  </>
                )}
                {activationName && (
                  <>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">{activationName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Group By Control */}
          <div className="shrink-0">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Group By
              </label>
              <Select value={groupBy} onValueChange={handleGroupByChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="border-border/50">
          <CardContent className="!p-0">
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading timeline data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-border/50 border-destructive/50">
          <CardContent className="!p-0">
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="rounded-full bg-destructive/10 p-4">
                <BarChart3 className="h-7 w-7 text-destructive" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">Failed to load timeline</p>
                <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {!isLoading && !error && data && (
        <>
          {/* Summary Stats */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 py-4">
            <div className="group">
              <div className="flex items-baseline gap-3 mb-1.5">
                <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                  {formatMetricValue(data.summary.totalValue, unit).value}
                </div>
                <div className="h-8 w-0.5 bg-blue-500" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Total
                </div>
                <div className="text-xs text-muted-foreground">{unitDisplay || unit}</div>
              </div>
            </div>

            <div className="group">
              <div className="flex items-baseline gap-3 mb-1.5">
                <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                  {formatMetricValue(data.summary.average, unit).value}
                </div>
                <div className="h-8 w-0.5 bg-purple-500" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Average
                </div>
                <div className="text-xs text-muted-foreground">{unitDisplay || unit}</div>
              </div>
            </div>

            <div className="group">
              <div className="flex items-baseline gap-3 mb-1.5">
                <div className="text-3xl font-light tabular-nums tracking-tight text-foreground">
                  {formatMetricValue(data.summary.min, unit).value}
                  <span className="text-xl text-muted-foreground mx-1.5">-</span>
                  {formatMetricValue(data.summary.max, unit).value}
                </div>
                <div className="h-8 w-0.5 bg-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Range
                </div>
                <div className="text-xs text-muted-foreground">{unitDisplay || unit}</div>
              </div>
            </div>

            <div className="group">
              <div className="flex items-baseline gap-3 mb-1.5">
                <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                  {data.summary.dataPointCount}
                </div>
                <div className="h-8 w-0.5 bg-orange-500" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  Data Points
                </div>
                <div className="text-xs text-muted-foreground">samples</div>
              </div>
            </div>
          </div>

          {/* Timeline Chart */}
          <Card className="border-border/50">
            <CardHeader className="!pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {type} Timeline
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Aggregated by {groupBy}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="!pt-6 !pb-6">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={450}>
                  <AreaChart 
                    data={chartData} 
                    margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      className="stroke-muted-foreground/20" 
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="formattedDate" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickLine={{ stroke: 'hsl(var(--border))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      dy={10}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickLine={{ stroke: 'hsl(var(--border))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        padding: '12px',
                      }}
                      labelStyle={{ 
                        color: 'hsl(var(--foreground))',
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                      itemStyle={{
                        color: 'hsl(var(--muted-foreground))',
                        fontSize: '13px',
                      }}
                      formatter={(value: number) => [
                        `${formatMetricValue(value, unit).value} ${unitDisplay}`,
                        type
                      ]}
                      cursor={{ fill: 'hsl(var(--accent))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                      dot={{ 
                        fill: '#6366f1', 
                        strokeWidth: 2, 
                        r: 4,
                        stroke: 'hsl(var(--card))',
                      }}
                      activeDot={{ 
                        r: 6, 
                        strokeWidth: 2,
                        stroke: 'hsl(var(--card))',
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="rounded-full bg-muted/50 p-4">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">No data points available</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      No metrics found for the selected time period and filters
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TimelineContent />
    </Suspense>
  );
}
