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
  type LucideIcon,
} from 'lucide-react';
import { AGENT_STATUS_CONFIG } from '@/lib/agent-status-config';
import { Agent, SliderType } from '../types';

interface AgentActionsSliderProps {
  agent: Agent;
  sliderType: SliderType;
  onSliderTypeChange: (type: SliderType) => void;
  onActivateClick: () => void;
  onDeactivateClick: () => void;
  onRestartClick: () => void;
  onRedeployClick: () => void;
  onDeleteClick: () => void;
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

export function AgentActionsSlider({
  agent,
  sliderType,
  onSliderTypeChange,
  onActivateClick,
  onDeactivateClick,
  onRestartClick,
  onRedeployClick,
  onDeleteClick,
}: AgentActionsSliderProps) {
  const { isParticipantMode } = useParticipantLayout();
  const canAccessSettings = !isParticipantMode;

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
              <MenuLink
                href={`/knowledge?agentName=${encodeURIComponent(agent.template)}&activationName=${encodeURIComponent(agent.name)}`}
                icon={BookOpen}
                label="Knowledge"
              />
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

            {/* Management — 2 columns with descriptions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onDeactivateClick}
                className="group flex items-start gap-2 px-2.5 py-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-left"
              >
                <Power className="h-4 w-4 text-muted-foreground group-hover:text-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    Deactivate
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Pause this agent instance
                  </p>
                </div>
              </button>
              <button
                onClick={onRestartClick}
                className="group flex items-start gap-2 px-2.5 py-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-left"
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground group-hover:text-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    Restart
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Deactivate and reactivate with the same settings
                  </p>
                </div>
              </button>
              <button
                onClick={onRedeployClick}
                className="group flex items-start gap-2 px-2.5 py-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-left"
              >
                <Rocket className="h-4 w-4 text-muted-foreground group-hover:text-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    Redeploy
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Undeploy and recreate with the same name
                  </p>
                </div>
              </button>
              <button
                onClick={onDeleteClick}
                disabled={agent.status === 'active'}
                className="group flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-destructive/5 transition-colors cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <Trash2 className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium group-hover:text-destructive">
                    Undeploy
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {agent.status === 'active'
                      ? 'Deactivate first to undeploy'
                      : 'Undeploy this instance from the tenant'}
                  </p>
                </div>
              </button>
            </div>
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

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onRedeployClick}
                className="group flex items-start gap-2 px-2.5 py-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-left"
              >
                <Rocket className="h-4 w-4 text-muted-foreground group-hover:text-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    Redeploy
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Undeploy and recreate with the same name
                  </p>
                </div>
              </button>
              <button
                onClick={onDeleteClick}
                className="group flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-destructive/5 transition-colors cursor-pointer text-left"
              >
                <Trash2 className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium group-hover:text-destructive">
                    Undeploy
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Undeploy this instance from the tenant
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    );
  }

  return null;
}
