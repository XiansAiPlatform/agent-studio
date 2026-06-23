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
  ChevronLeft,
  Menu,
  LayoutDashboard,
  Server,
  BookOpen,
  ShieldCheck,
  Building2,
  Users,
  Code2,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AgentSelectionContent,
  AgentSelectionPanel,
} from '@/components/features/conversations/agent-selection-panel';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import type { Capability } from '@/lib/auth/capabilities';

// Types for panel configuration
type PanelConfig = {
  title: string;
  description: string;
  basePath: string;
  queryParams?: string;
  useQueryParams?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
};

type NavigationChild = {
  name: string;
  href: string;
  triggersPanel?: boolean;
  panelConfig?: PanelConfig;
};

type NavigationItem = {
  name: string;
  href: string;
  icon: any;
  triggersPanel?: boolean;
  panelConfig?: PanelConfig;
  children?: NavigationChild[];
  /** When set, the item is only shown if the user has this capability. */
  capability?: Capability;
};

const navigation: NavigationItem[] = [
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
    triggersPanel: true,
    panelConfig: {
      title: 'Select an Agent',
      description: 'Choose an activation to start chatting',
      basePath: '/conversations',
      queryParams: 'topic=general-discussions',
      useQueryParams: false,
      icon: MessageSquare,
    },
  },
  {
    name: 'Agent Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { name: 'Agent Store', href: '/settings/agent-store' },
      { 
        name: 'Knowledge Base', 
        href: '/knowledge', 
        triggersPanel: true,
        panelConfig: {
          title: 'Select an Agent',
          description: 'Choose an agent to view its knowledge base',
          basePath: '/knowledge',
          useQueryParams: true,
          icon: BookOpen,
        },
      },
      { 
        name: 'Data Explorer', 
        href: '/settings/database', 
        triggersPanel: true,
        panelConfig: {
          title: 'Select an Agent',
          description: 'Choose an agent to access database functionality',
          basePath: '/settings/database',
          useQueryParams: true,
          icon: Database,
        },
      },
      { 
        name: 'Connections', 
        href: '/settings/connections',
        triggersPanel: true,
        panelConfig: {
          title: 'Select an Agent',
          description: 'Choose an agent to manage connections',
          basePath: '/settings/connections',
          useQueryParams: true,
          icon: Server,
        },
      },
      {
        name: 'Schedules',
        href: '/settings/schedules',
        triggersPanel: true,
        panelConfig: {
          title: 'Select an Agent',
          description: 'Choose an agent to manage its schedules',
          basePath: '/settings/schedules',
          useQueryParams: true,
          icon: CalendarClock,
        },
      },
      { name: 'Performance', href: '/settings/performance' },
      { name: 'Activity Logs', href: '/settings/logs' },
      { name: 'Secrets', href: '/settings/secrets' },
    ],
  },
  {
    name: 'Tenant Admin',
    href: '/tenant-settings',
    icon: Users,
    capability: 'tenant:manage-users',
    children: [
      { name: 'Users', href: '/tenant-settings/users' },
    ],
  },
  {
    name: 'Developer',
    href: '/developer',
    icon: Code2,
    capability: 'developer:access',
    children: [
      { name: 'Secrets', href: '/developer/secrets' },
    ],
  },
  {
    name: 'System Admin',
    href: '/system-admin',
    icon: ShieldCheck,
    capability: 'system:admin',
    children: [
      { name: 'Tenants', href: '/system-admin/tenants' },
      { name: 'Users', href: '/system-admin/users' },
    ],
  },
];

function NavItem({
  item,
  collapsed,
  active,
  pathname,
  onPanelTriggerClick,
  isPanelOpen,
  activePanelMode,
  onNavigate,
}: {
  item: NavigationItem;
  collapsed: boolean;
  active: boolean;
  pathname: string;
  onPanelTriggerClick?: (itemName: string) => void;
  isPanelOpen?: boolean;
  activePanelMode?: string | null;
  onNavigate?: () => void;
}) {
  const [expanded, setExpanded] = useState(active);
  const Icon = item.icon;

  const hasChildren = item.children;
  const triggersPanelItem = item.triggersPanel === true;

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
          {triggersPanelItem ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                onPanelTriggerClick?.(item.name);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all relative group',
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
                  <span className="flex-1 truncate text-left">{item.name}</span>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 transition-all group-hover:translate-x-0.5',
                      isPanelOpen && 'rotate-90'
                    )}
                  />
                </>
              )}
            </button>
          ) : (
            <Link
              href={item.href}
              onClick={(e) => {
                if (hasChildren && !collapsed) {
                  e.preventDefault();
                  setExpanded(!expanded);
                  return;
                }
                onNavigate?.();
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
          )}
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{item.name}</p>
        </TooltipContent>
      </Tooltip>

      {/* Regular children for other items */}
      {!collapsed && expanded && item.children && (
        <div className="ml-8 mt-1 space-y-1">
          {item.children.map((child) => {
            const isActive = isChildActive(child) || (activePanelMode === child.name);
            const childTriggersPanel = child.triggersPanel === true;
            return (
              <Tooltip key={child.href}>
                <TooltipTrigger asChild>
                  {childTriggersPanel ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onPanelTriggerClick?.(child.name);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-sm relative transition-colors",
                        "hover:bg-accent/30",
                        isActive
                          ? 'bg-accent/20 text-foreground font-medium border-l-2 border-l-primary rounded-r-md'
                          : 'text-muted-foreground border-l-2 border-l-transparent rounded-md'
                      )}
                    >
                      <span className="truncate">{child.name}</span>
                    </button>
                  ) : (
                    <Link
                      href={child.href}
                      onClick={() => onNavigate?.()}
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
                  )}
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

// Helper function to find panel config for a given item name
const findPanelConfig = (itemName: string): PanelConfig | null => {
  // Check top-level navigation items
  for (const item of navigation) {
    if (item.name === itemName && item.panelConfig) {
      return item.panelConfig;
    }
    // Check children
    if (item.children) {
      for (const child of item.children) {
        if (child.name === itemName && child.panelConfig) {
          return child.panelConfig;
        }
      }
    }
  }
  return null;
};

interface SidebarProps {
  /**
   * When true, render in mobile-drawer mode: full width, no aside chrome, no
   * collapse toggle. The hosting `Sheet` is responsible for surface + width.
   */
  mobile?: boolean;
  /**
   * Called after the user navigates from a sidebar item. In mobile mode the
   * host should close the drawer; on desktop this is a no-op.
   */
  onNavigate?: () => void;
}

/**
 * Build the destination URL for a panel-trigger item once an activation has
 * been selected. Mirrors the desktop floating panel routing logic.
 */
function buildPanelDestinationUrl(
  config: PanelConfig,
  agentName: string,
  activationName: string
): string {
  if (config.useQueryParams) {
    const params = new URLSearchParams({ agentName, activationName });
    if (config.queryParams) {
      const additionalParams = new URLSearchParams(config.queryParams);
      additionalParams.forEach((value, key) => params.set(key, value));
    }
    return `${config.basePath}?${params.toString()}`;
  }
  return `${config.basePath}/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}${config.queryParams ? `?${config.queryParams}` : ''}`;
}

export function Sidebar({ mobile = false, onNavigate }: SidebarProps = {}) {
  // In mobile drawer mode the sidebar is always expanded.
  const [collapsed, setCollapsed] = useState(false);
  const [activePanelMode, setActivePanelMode] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermissions();

  const visibleNavigation = navigation.filter((item) =>
    item.capability ? can(item.capability) : true
  );

  const effectiveCollapsed = mobile ? false : collapsed;
  const activePanelConfig = activePanelMode ? findPanelConfig(activePanelMode) : null;

  const handlePanelTriggerClick = (itemName: string) => {
    // Both mobile and desktop: open the agent picker so the user can select
    // an activation. The chosen activation drives the per-agent URL params
    // that destination pages (Conversations, Knowledge, Connections, Data
    // Explorer) require to render the right data.
    setActivePanelMode(activePanelMode === itemName ? null : itemName);
  };

  const navContent = (
    <div className="flex h-full flex-col">
      {!mobile && (
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!effectiveCollapsed && <span className="font-semibold">Navigation</span>}
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
      )}
      <nav
        className={cn(
          'flex-1 space-y-1 p-4 overflow-y-auto',
          mobile && 'pt-2'
        )}
      >
        {visibleNavigation.map((item) => {
          const isExactMatch = pathname === item.href;
          const hasActiveChild = item.children?.some(child => pathname === child.href) || false;
          const isActive = isExactMatch || hasActiveChild ||
            (pathname.startsWith(item.href) && item.href !== '/');

          const childTriggeredPanel = Boolean(
            activePanelMode && item.children?.some(child => child.name === activePanelMode)
          );
          const finalActive = activePanelMode
            ? (item.name === activePanelMode || childTriggeredPanel)
            : isActive;

          return (
            <NavItem
              key={item.name}
              item={item}
              collapsed={effectiveCollapsed}
              active={finalActive}
              pathname={pathname}
              onPanelTriggerClick={handlePanelTriggerClick}
              isPanelOpen={activePanelMode === item.name}
              activePanelMode={activePanelMode}
              onNavigate={mobile ? onNavigate : undefined}
            />
          );
        })}
      </nav>
    </div>
  );

  // Mobile: when a panel-trigger item is tapped, replace the navigation drawer
  // contents with the agent picker (rather than routing without the required
  // ?agentName/?activationName params). The user picks an activation, which
  // routes to the per-agent destination URL and closes the drawer.
  let mobilePanelContent: React.ReactNode = null;
  if (mobile && activePanelMode && activePanelConfig) {
    const PanelIcon = activePanelConfig.icon;
    mobilePanelContent = (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 px-3 py-3 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActivePanelMode(null)}
            className="h-9 w-9 -ml-1 shrink-0"
            aria-label="Back to navigation"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2 truncate">
              {PanelIcon && <PanelIcon className="h-4 w-4 shrink-0" />}
              <span className="truncate">{activePanelConfig.title}</span>
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {activePanelConfig.description}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <AgentSelectionContent
            onActivationSelect={(activationName, agentName) => {
              const url = buildPanelDestinationUrl(activePanelConfig, agentName, activationName);
              router.push(url);
              setActivePanelMode(null);
              onNavigate?.();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      {mobile ? (
        mobilePanelContent ?? navContent
      ) : (
        <aside
          className={cn(
            // h-full ensures the right border extends to the bottom of the
            // viewport regardless of how short the navigation list is.
            'h-full border-r bg-background transition-all duration-300',
            effectiveCollapsed ? 'w-16' : 'w-64'
          )}
        >
          {navContent}
        </aside>
      )}

      {/* Desktop floating agent selection panel. */}
      {!mobile && activePanelMode && activePanelConfig && (
        <AgentSelectionPanel
          isOpen={!!activePanelMode}
          onClose={() => setActivePanelMode(null)}
          sidebarCollapsed={collapsed}
          title={activePanelConfig.title}
          description={activePanelConfig.description}
          icon={activePanelConfig.icon}
          onActivationSelect={(activationName, agentName) => {
            const url = buildPanelDestinationUrl(activePanelConfig, agentName, activationName);
            router.push(url);
          }}
        />
      )}
    </TooltipProvider>
  );
}
