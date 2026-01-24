'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckCircle,
  MessageSquare,
  Bot,
  Database,
  BarChart,
  Settings,
  ChevronRight,
  Menu,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Agents',
    href: '/agents/running',
    icon: Bot,
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: CheckCircle,
  },
  {
    name: 'Conversations',
    href: '/conversations',
    icon: MessageSquare,
  },
  {
    name: 'Knowledge',
    href: '/knowledge',
    icon: Database,
    children: [
      { name: 'Knowledge Articles', href: '/knowledge' },
    ],
  },
  {
    name: 'Performance',
    href: '/performance',
    icon: BarChart,
    children: [
      { name: 'Metrics & KPIs', href: '/performance/metrics' },
      { name: 'Usage Analytics', href: '/performance/analytics' },
      { name: 'Cost Tracking', href: '/performance/costs' },
    ],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { name: 'Agent Store', href: '/settings/agent-store' },
      { name: 'Tenant', href: '/settings/tenant' },
      { name: 'Platform Config', href: '/settings/platform' },
      { name: 'Integrations', href: '/settings/integrations' },
      { name: 'User Management', href: '/settings/users' },
      { name: 'Billing', href: '/settings/billing' },
    ],
  },
];

function NavItem({
  item,
  collapsed,
  active,
  pathname,
}: {
  item: (typeof navigation)[0];
  collapsed: boolean;
  active: boolean;
  pathname: string;
}) {
  const [expanded, setExpanded] = useState(active);
  const Icon = item.icon;

  const hasChildren = item.children;

  // Check if any child is active
  const isChildActive = (child: { href: string }) => pathname === child.href;
  const hasActiveChild = item.children?.some(isChildActive) || false;

  // Automatically expand when active (including when a child is active)
  useEffect(() => {
    if (active) {
      setExpanded(true);
    }
  }, [active]);

  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            onClick={(e) => {
              if (hasChildren && !collapsed) {
                e.preventDefault();
                setExpanded(!expanded);
              }
            }}
            className={cn(
              'flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all relative group',
              'hover:bg-accent/30 hover:translate-x-0.5',
              active
                ? 'bg-accent/20 text-foreground border-l-2 border-l-primary rounded-r-md'
                : 'text-muted-foreground border-l-2 border-l-transparent rounded-md',
              collapsed && 'justify-center'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{item.name}</span>
                {hasChildren && (
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 transition-all group-hover:translate-x-0.5',
                      expanded && 'rotate-90'
                    )}
                  />
                )}
              </>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{item.name}</p>
        </TooltipContent>
      </Tooltip>

      {/* Regular children for other items */}
      {!collapsed && expanded && item.children && (
        <div className="ml-8 mt-1 space-y-1">
          {item.children.map((child) => {
            const isActive = isChildActive(child);
            return (
              <Tooltip key={child.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={child.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm relative transition-colors",
                      "hover:bg-accent/30",
                      isActive
                        ? 'bg-accent/20 text-foreground font-medium border-l-2 border-l-primary rounded-r-md'
                        : 'text-muted-foreground border-l-2 border-l-transparent rounded-md'
                    )}
                  >
                    <span className="truncate">{child.name}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{child.name}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'border-r bg-background transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            {!collapsed && <span className="font-semibold">Navigation</span>}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 transition-all hover:bg-primary/10 hover:text-primary group"
            >
              <Menu className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </div>
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {navigation.map((item) => {
              // Check if current path matches this item or any of its children
              const isExactMatch = pathname === item.href;
              const hasActiveChild = item.children?.some(child => pathname === child.href) || false;
              const isActive = isExactMatch || hasActiveChild || 
                (pathname.startsWith(item.href) && item.href !== '/');
              
              return (
                <NavItem
                  key={item.name}
                  item={item}
                  collapsed={collapsed}
                  active={isActive}
                  pathname={pathname}
                />
              );
            })}
          </nav>
        </div>
      </aside>
    </TooltipProvider>
  );
}
