'use client';

import { Globe, Building2, Zap } from 'lucide-react';

interface KnowledgeStatsCardsProps {
  systemCount: number;
  tenantCount: number;
  activationCount: number;
}

export function KnowledgeStatsCards({
  systemCount,
  tenantCount,
  activationCount,
}: KnowledgeStatsCardsProps) {
  return (
    <div className="grid gap-8 md:grid-cols-3 py-4">
      <StatCard
        count={systemCount}
        icon={Globe}
        iconColor="text-blue-500"
        barColor="bg-blue-500"
        title="System Level"
        description="Base knowledge used"
      />
      <StatCard
        count={tenantCount}
        icon={Building2}
        iconColor="text-amber-500"
        barColor="bg-amber-500"
        title="Organization Level"
        description="Organization knowledge used"
      />
      <StatCard
        count={activationCount}
        icon={Zap}
        iconColor="text-emerald-500"
        barColor="bg-emerald-500"
        title="Agent Level"
        description="Agent specific knowledge used"
      />
    </div>
  );
}

interface StatCardProps {
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  barColor: string;
  title: string;
  description: string;
}

function StatCard({
  count,
  icon: Icon,
  iconColor,
  barColor,
  title,
  description,
}: StatCardProps) {
  return (
    <div className="group">
      <div className="flex items-baseline gap-3 mb-1.5">
        <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
          {count}
        </div>
        <div className={`h-8 w-0.5 ${barColor}`} />
      </div>
      <div className="space-y-0.5">
        <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}
