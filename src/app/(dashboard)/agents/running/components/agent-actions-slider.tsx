import Link from 'next/link';
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useParticipantLayout } from '@/contexts/participant-layout-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { IconAvatar } from '@/components/ui/icon-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bot,
  MessageSquare,
  ListTodo,
  Settings,
  Activity,
  TrendingUp,
  BookOpen,
  Power,
  RefreshCw,
  Rocket,
  Trash2,
  Info,
  CheckCircle,
  AlertCircle,
  Database,
  Plug,
  Star,
  KeyRound,
  CalendarClock,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { AGENT_STATUS_CONFIG } from '@/lib/agent-status-config';
import { Agent, SliderType } from '../types';
import { cn } from '@/lib/utils';

interface AgentActionsSliderProps {
  agent: Agent;
  sliderType: SliderType;
  canEdit?: boolean;
  onSliderTypeChange: (type: SliderType) => void;
  onActivateClick: () => void;
  onDeactivateClick: () => void;
  onReactivateClick: () => void;
  onRedeployClick: () => void;
  onUndeployClick: () => void;
}

function MenuLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate">
        {label}
      </span>
    </Link>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer w-full text-left"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate">
        {label}
      </span>
    </button>
  );
}

interface SplitActionMenuItem {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
}

function SplitActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  menuItems,
  destructive = false,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  menuItems: SplitActionMenuItem[];
  destructive?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex rounded-lg overflow-hidden',
        destructive
          ? 'hover:bg-destructive/5'
          : 'bg-muted/30 hover:bg-muted/60',
        'transition-colors'
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="group flex flex-1 items-start gap-2 px-2.5 py-2 cursor-pointer text-left min-w-0"
      >
        <Icon
          className={cn(
            'h-4 w-4 mt-0.5 flex-shrink-0',
            destructive
              ? 'text-destructive'
              : 'text-muted-foreground group-hover:text-foreground'
          )}
        />
        <div className="min-w-0">
          <div
            className={cn(
              'text-xs font-medium',
              destructive
                ? 'group-hover:text-destructive'
                : 'text-muted-foreground group-hover:text-foreground'
            )}
          >
            {label}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {description}
          </p>
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${label} more options`}
            className={cn(
              'flex items-center px-1.5 border-l cursor-pointer',
              destructive
                ? 'border-destructive/10 hover:bg-destructive/10 text-destructive'
                : 'border-border/40 hover:bg-muted/80 text-muted-foreground'
            )}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.label}
              onClick={item.onClick}
              className="cursor-pointer gap-2"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-sm">{item.label}</div>
                {item.description && (
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {item.description}
                  </p>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function AgentActionsSlider({
  agent,
  sliderType,
  onSliderTypeChange,
  onActivateClick,
  onDeactivateClick,
  onReactivateClick,
  onRedeployClick,
  onUndeployClick,
  canEdit = true,
}: AgentActionsSliderProps) {
  const { isParticipantMode } = useParticipantLayout();
  const canAccessSettings = !isParticipantMode && canEdit;

  if (sliderType === 'actions' && agent.status === 'active') {
    return (
      <SheetContent className="flex flex-col p-0 border-l border-border/40 backdrop-blur-xl bg-background sm:max-w-lg">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/20">
          <div className="flex items-center gap-3">
            <IconAvatar
              icon={Bot}
              variant="agent"
              size="md"
              rounded="full"
              pulse={true}
            />
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold whitespace-normal break-words">
                {agent.name}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={AGENT_STATUS_CONFIG[agent.status].variant}
                  className={`${AGENT_STATUS_CONFIG[agent.status].colors.badge} text-xs`}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {AGENT_STATUS_CONFIG[agent.status].label}
                </Badge>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground truncate">
                  {agent.template}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            {agent.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {agent.description}
              </p>
            )}

            {/* Primary actions — 2 columns */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/conversations/${encodeURIComponent(agent.template)}/${encodeURIComponent(agent.name)}?topic=general-discussions`}
                className="group flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-primary/5 transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-medium text-sm group-hover:text-primary transition-colors">
                  Talk to Agent
                </span>
              </Link>
              <Link
                href={`/tasks?status=pending&agent=${encodeURIComponent(agent.template)}&activation=${encodeURIComponent(agent.name)}`}
                className="group flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-primary/5 transition-colors"
              >
                <ListTodo className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-medium text-sm group-hover:text-primary transition-colors">
                  View Tasks
                </span>
              </Link>
            </div>

            {canEdit && (
            <>
            <Separator className="opacity-40" />

            {/* Secondary menus — 2 columns */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              {canAccessSettings && (
                <MenuButton
                  icon={Settings}
                  label="Configuration"
                  onClick={() => onSliderTypeChange('configure')}
                />
              )}
              {canAccessSettings && (
                <MenuLink
                  href={`/settings/database?agentName=${encodeURIComponent(agent.template)}&activationName=${encodeURIComponent(agent.name)}`}
                  icon={Database}
                  label="Explore Data"
                />
              )}
              {canAccessSettings && (
                <MenuLink
                  href={`/knowledge?agentName=${encodeURIComponent(agent.template)}&activationName=${encodeURIComponent(agent.name)}`}
                  icon={BookOpen}
                  label="Knowledge"
                />
              )}
              {canAccessSettings && (
                <MenuLink
                  href={`/settings/connections?agentName=${encodeURIComponent(agent.template)}&activationName=${encodeURIComponent(agent.name)}`}
                  icon={Plug}
                  label="Connections"
                />
              )}
              {canAccessSettings && (
                <MenuLink
                  href={`/settings/logs?agent=${encodeURIComponent(agent.template)}&activation=${encodeURIComponent(agent.name)}`}
                  icon={Activity}
                  label="Activity Logs"
                />
              )}
              {canAccessSettings && (
                <MenuLink
                  href={`/settings/performance?agent=${encodeURIComponent(agent.template)}&activation=${encodeURIComponent(agent.name)}`}
                  icon={TrendingUp}
                  label="Performance"
                />
              )}
              {canAccessSettings && (
                <MenuLink
                  href={`/settings/feedback?agentName=${encodeURIComponent(agent.template)}`}
                  icon={Star}
                  label="Feedback"
                />
              )}
              {canAccessSettings && (
                <MenuLink
                  href="/settings/secrets"
                  icon={KeyRound}
                  label="Secrets"
                />
              )}
              {canAccessSettings && (
                <MenuLink
                  href={`/settings/schedules?agentName=${encodeURIComponent(agent.template)}&activationName=${encodeURIComponent(agent.name)}`}
                  icon={CalendarClock}
                  label="Schedules"
                />
              )}
            </div>

            <Separator className="opacity-40" />

            {/* Management — split buttons */}
            <div className="grid grid-cols-2 gap-2">
              <SplitActionButton
                icon={Power}
                label="Deactivate"
                description="Stop this instance. You can reactivate it later"
                onClick={onDeactivateClick}
                menuItems={[
                  {
                    icon: RefreshCw,
                    label: 'Reactivate',
                    description:
                      'Deactivate and activate again with the same configuration',
                    onClick: onReactivateClick,
                  },
                ]}
              />
              <SplitActionButton
                icon={Trash2}
                label="Undeploy"
                description="Permanently remove this instance from the tenant"
                onClick={onUndeployClick}
                destructive
                menuItems={[
                  {
                    icon: Rocket,
                    label: 'Redeploy',
                    description:
                      'Undeploy and deploy a fresh instance with the same name and configuration',
                    onClick: onRedeployClick,
                  },
                ]}
              />
            </div>
            </>
            )}
          </div>
        </div>
      </SheetContent>
    );
  }

  if (sliderType === 'actions' && agent.status === 'inactive') {
    return (
      <SheetContent className="flex flex-col p-0 border-l border-border/40 backdrop-blur-xl bg-background sm:max-w-lg">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/20">
          <div className="flex items-center gap-3">
            <IconAvatar icon={Bot} variant="agent" size="md" rounded="full" />
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold whitespace-normal break-words">
                {agent.name}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={AGENT_STATUS_CONFIG[agent.status].variant}
                  className={`${AGENT_STATUS_CONFIG[agent.status].colors.badge} text-xs`}
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {AGENT_STATUS_CONFIG[agent.status].label}
                </Badge>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground truncate">
                  {agent.template}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            {agent.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {agent.description}
              </p>
            )}

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-primary/90 leading-relaxed">
                This agent is inactive. Activate it to enable conversations,
                tasks, and other capabilities.
              </p>
            </div>

            {canEdit && (
            <>
            <Button
              size="lg"
              variant="default"
              className="w-full justify-start h-auto py-2.5 px-3 rounded-lg"
              onClick={onActivateClick}
            >
              <Power className="h-4 w-4 mr-2.5" />
              <div className="text-left">
                <div className="font-semibold text-sm">Activate Agent</div>
                <div className="text-xs opacity-90">
                  Start this instance and begin working
                </div>
              </div>
            </Button>

            <Separator className="opacity-40" />

            <SplitActionButton
              icon={Trash2}
              label="Undeploy"
              description="Permanently remove this instance from the tenant"
              onClick={onUndeployClick}
              destructive
              menuItems={[
                {
                  icon: Rocket,
                  label: 'Redeploy',
                  description:
                    'Undeploy and deploy a fresh instance with the same name and configuration',
                  onClick: onRedeployClick,
                },
              ]}
            />
            </>
            )}
          </div>
        </div>
      </SheetContent>
    );
  }

  return null;
}
