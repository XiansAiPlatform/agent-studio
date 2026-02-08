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
  Server,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AgentSelectionPanel } from '@/components/features/conversations/agent-selection-panel';
import { useRouter } from 'next/navigation';

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
    name: 'Settings',
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
      { name: 'Performance', href: '/settings/performance' },
      { name: 'Activity Logs', href: '/settings/logs' },

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
}: {
  item: NavigationItem;
  collapsed: boolean;
  active: boolean;
  pathname: string;
  onPanelTriggerClick?: (itemName: string) => void;
  isPanelOpen?: boolean;
  activePanelMode?: string | null;
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

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [activePanelMode, setActivePanelMode] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  
  const activePanelConfig = activePanelMode ? findPanelConfig(activePanelMode) : null;

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
              
              // When panel is open, check if this item or any of its children triggered the panel
              const childTriggeredPanel = Boolean(activePanelMode && item.children?.some(child => child.name === activePanelMode));
              const finalActive = activePanelMode
                ? (item.name === activePanelMode || childTriggeredPanel)
                : isActive;
              
              return (
                <NavItem
                  key={item.name}
                  item={item}
                  collapsed={collapsed}
                  active={finalActive}
                  pathname={pathname}
                  onPanelTriggerClick={(itemName) => {
                    // Toggle: if same item clicked, close panel; otherwise switch to new item
                    setActivePanelMode(activePanelMode === itemName ? null : itemName);
                  }}
                  isPanelOpen={activePanelMode === item.name}
                  activePanelMode={activePanelMode}
                />
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Agent Selection Panel */}
      {activePanelMode && activePanelConfig && (
        <AgentSelectionPanel
          isOpen={!!activePanelMode}
          onClose={() => setActivePanelMode(null)}
          sidebarCollapsed={collapsed}
          title={activePanelConfig.title}
          description={activePanelConfig.description}
          icon={activePanelConfig.icon}
          onActivationSelect={(activationName, agentName) => {
            let url: string;
            
            if (activePanelConfig.useQueryParams) {
              // Use query parameters for agent and activation
              const params = new URLSearchParams({
                agentName,
                activationName,
              });
              if (activePanelConfig.queryParams) {
                // Add any additional query params
                const additionalParams = new URLSearchParams(activePanelConfig.queryParams);
                additionalParams.forEach((value, key) => params.set(key, value));
              }
              url = `${activePanelConfig.basePath}?${params.toString()}`;
            } else {
              // Use path parameters for agent and activation
              url = `${activePanelConfig.basePath}/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}${activePanelConfig.queryParams ? `?${activePanelConfig.queryParams}` : ''}`;
            }
            
            router.push(url);
          }}
        />
      )}
    </TooltipProvider>
  );
}
