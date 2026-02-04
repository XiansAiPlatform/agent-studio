'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Settings2,
  Database,
  Plug,
  BarChart3,
  FileText,
  Bot,
  ArrowRight,
} from 'lucide-react';

export default function SettingsPage() {
  const settingsSections = [
    {
      title: 'Agent Store',
      description: 'Manage and deploy agents from the store',
      href: '/settings/agent-store',
      icon: Bot,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 dark:bg-blue-400/10',
    },
    {
      title: 'Connections',
      description: 'Configure external service connections and integrations',
      href: '/settings/connections',
      icon: Plug,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10 dark:bg-green-400/10',
    },
    {
      title: 'Database',
      description: 'View and manage your database schema and records',
      href: '/settings/database',
      icon: Database,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10 dark:bg-purple-400/10',
    },
    {
      title: 'Performance',
      description: 'Monitor system performance metrics and analytics',
      href: '/settings/performance',
      icon: BarChart3,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/10 dark:bg-orange-400/10',
    },
    {
      title: 'Logs',
      description: 'View system logs and debug information',
      href: '/settings/logs',
      icon: FileText,
      color: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-500/10 dark:bg-slate-400/10',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your workspace configuration, integrations, and system preferences
        </p>
      </div>

      {/* Settings Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="group h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${section.bgColor} transition-transform group-hover:scale-110`}>
                      <Icon className={`h-6 w-6 ${section.color}`} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {section.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {section.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
