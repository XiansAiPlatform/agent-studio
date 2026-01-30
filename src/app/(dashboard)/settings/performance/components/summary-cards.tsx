'use client';

import { BarChart3, Activity, Layers } from 'lucide-react';
import { formatCompactNumber } from '../utils/format-helpers';

interface SummaryCardsProps {
  totalRecords: number;
  totalTypes: number;
  totalCategories: number;
}

export function SummaryCards({
  totalRecords,
  totalTypes,
  totalCategories,
}: SummaryCardsProps) {
  const stats = [
    {
      title: 'Total Records',
      value: totalRecords,
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      barColor: 'bg-blue-500',
    },
    {
      title: 'Metric Types',
      value: totalTypes,
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      barColor: 'bg-purple-500',
    },
    {
      title: 'Categories',
      value: totalCategories,
      icon: Layers,
      color: 'text-orange-600 dark:text-orange-400',
      barColor: 'bg-orange-500',
    },
  ];

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 py-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.title} className="group">
            <div className="flex items-baseline gap-3 mb-1.5">
              <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                {formatCompactNumber(stat.value)}
              </div>
              <div className={`h-8 w-0.5 ${stat.barColor}`} />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                {stat.title}
              </div>
              <div className="text-xs text-muted-foreground">Tracked</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
