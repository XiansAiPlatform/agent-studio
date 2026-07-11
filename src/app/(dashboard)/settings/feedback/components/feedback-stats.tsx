'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageSquare, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getReasonLabel } from '@/components/features/conversations/message-feedback';
import { cn } from '@/lib/utils';
import type { FeedbackStatsResponse } from '../types';

interface FeedbackStatsProps {
  stats: FeedbackStatsResponse | null;
  loading: boolean;
  error: string | null;
}

/** Color ramp for rating bars: red (1) -> amber (3) -> green (5). */
const RATING_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FeedbackStats({ stats, loading, error }: FeedbackStatsProps) {
  if (error) {
    return (
      <Card className="py-4">
        <CardContent className="px-4 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="py-4">
            <CardContent className="px-4">
              <div className="h-14 animate-pulse rounded-lg bg-muted/50" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const ratingData = stats.ratingCounts.map((r) => ({
    rating: `${r.rating}★`,
    ratingValue: r.rating,
    count: r.count,
  }));

  const maxReasonCount = stats.reasonCategoryCounts.reduce(
    (max, r) => Math.max(max, r.count),
    0
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={MessageSquare}
          label="Total feedback"
          value={stats.total.toLocaleString()}
        />
        <StatCard
          icon={Star}
          label="Average rating"
          value={stats.total > 0 ? stats.averageRating.toFixed(2) : '—'}
          hint={stats.total > 0 ? 'out of 5' : undefined}
        />
        <StatCard
          icon={TrendingUp}
          label="Low ratings (1–3)"
          value={stats.ratingCounts
            .filter((r) => r.rating <= 3)
            .reduce((sum, r) => sum + r.count, 0)
            .toLocaleString()}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Rating distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Rating distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.total === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No feedback for the selected filters.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <XAxis
                      dataKey="rating"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--popover)',
                        color: 'var(--popover-foreground)',
                      }}
                      formatter={(value) => [value as number, 'Count']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={64}>
                      {ratingData.map((d) => (
                        <Cell key={d.rating} fill={RATING_COLORS[d.ratingValue]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reason categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top reasons (low ratings)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.reasonCategoryCounts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No reason data for the selected filters.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {stats.reasonCategoryCounts.slice(0, 8).map((r) => {
                  const pct = maxReasonCount > 0 ? (r.count / maxReasonCount) * 100 : 0;
                  return (
                    <li key={r.category} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-foreground">
                          {getReasonLabel(r.category)}
                        </span>
                        <span className="shrink-0 font-medium text-muted-foreground">
                          {r.count}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full bg-primary/70')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
