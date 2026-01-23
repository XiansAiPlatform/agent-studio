import Link from 'next/link';
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  Trash2,
  Info,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { AGENT_STATUS_CONFIG } from '@/lib/agent-status-config';
import { Agent, SliderType } from '../types';

interface AgentActionsSliderProps {
  agent: Agent;
  sliderType: SliderType;
  onSliderTypeChange: (type: SliderType) => void;
  onActivateClick: () => void;
  onDeactivateClick: () => void;
  onDeleteClick: () => void;
}

export function AgentActionsSlider({
  agent,
  sliderType,
  onSliderTypeChange,
  onActivateClick,
  onDeactivateClick,
  onDeleteClick,
}: AgentActionsSliderProps) {
  if (sliderType === 'actions' && agent.status === 'active') {
    return (
      <SheetContent className="flex flex-col p-0 border-l border-border/40 backdrop-blur-xl bg-background/95">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <IconAvatar icon={Bot} variant={agent.variant} size="lg" rounded="lg" pulse={true} />
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold whitespace-normal break-words tracking-tight">{agent.name}</SheetTitle>
              <SheetDescription className="text-sm mt-1 whitespace-normal break-words leading-relaxed">
                {agent.description}
              </SheetDescription>
              <div className="flex items-start gap-2 mt-2 flex-wrap">
                <Badge 
                  variant={AGENT_STATUS_CONFIG[agent.status].variant}
                  className={`${AGENT_STATUS_CONFIG[agent.status].colors.badge} shadow-sm`}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {AGENT_STATUS_CONFIG[agent.status].label}
                </Badge>
                <Badge variant="outline" className="text-xs whitespace-normal break-words bg-slate-50/80 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                  {agent.template}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>


        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-muted-foreground/80 mb-3 uppercase tracking-wider">Quick Actions</h3>
            
            <Button
              size="default"
              variant="outline"
              className="w-full justify-start transition-all duration-300 hover:bg-primary/5 hover:text-primary hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 group h-auto py-2.5 rounded-xl border-border/40"
              asChild
            >
              <Link href={`/conversations?agent-name=${encodeURIComponent(agent.template)}&activation-name=${encodeURIComponent(agent.name)}`}>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3.5 transition-transform group-hover:scale-110 group-hover:bg-primary/15">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">Talk to Agent</div>
                  <div className="text-xs text-muted-foreground/70">Start a conversation</div>
                </div>
              </Link>
            </Button>
            
            <Button
              size="default"
              variant="outline"
              className="w-full justify-start transition-all duration-300 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5 hover:-translate-y-0.5 group h-auto py-2.5 rounded-xl border-border/40"
              asChild
            >
              <Link href={`/tasks/pending?agent-name=${encodeURIComponent(agent.template)}&activation-name=${encodeURIComponent(agent.name)}&topic=general-discussions`}>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mr-3.5 transition-transform group-hover:scale-110 group-hover:bg-blue-500/15">
                  <ListTodo className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">View Tasks</div>
                  <div className="text-xs text-muted-foreground/70">Manage pending items</div>
                </div>
              </Link>
            </Button>
            
            <Button
              size="default"
              variant="outline"
              className="w-full justify-start transition-all duration-300 hover:bg-orange-500/5 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500/30 hover:shadow-md hover:shadow-orange-500/5 hover:-translate-y-0.5 group h-auto py-2.5 rounded-xl border-border/40"
              asChild
            >
              <Link href={`/knowledge?agents=${encodeURIComponent(agent.name)}`}>
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center mr-3.5 transition-transform group-hover:scale-110 group-hover:bg-orange-500/15">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">Knowledge Base</div>
                  <div className="text-xs text-muted-foreground/70">Browse resources</div>
                </div>
              </Link>
            </Button>

            <div className="my-4" />

            <h3 className="text-xs font-semibold text-muted-foreground/80 mb-2 mt-4 uppercase tracking-wider">Insights</h3>
            
            <Button
              size="default"
              variant="outline"
              className="w-full justify-start transition-all duration-300 hover:bg-purple-500/5 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-500/30 hover:shadow-md hover:shadow-purple-500/5 hover:-translate-y-0.5 group h-auto py-2.5 rounded-xl border-border/40"
              onClick={() => onSliderTypeChange('configure')}
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mr-3.5 transition-all group-hover:scale-110 group-hover:bg-purple-500/15 group-hover:rotate-90">
                <Settings className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm">Configuration</div>
                <div className="text-xs text-muted-foreground/70">Workflow settings</div>
              </div>
            </Button>
            
            <Button
              size="default"
              variant="outline"
              className="w-full justify-start transition-all duration-300 hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5 hover:-translate-y-0.5 group h-auto py-2.5 rounded-xl border-border/40"
              onClick={() => onSliderTypeChange('activity')}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mr-3.5 transition-transform group-hover:scale-110 group-hover:bg-emerald-500/15">
                <Activity className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm">Activity Logs</div>
                <div className="text-xs text-muted-foreground/70">Recent history</div>
              </div>
            </Button>
            
            <Button
              size="default"
              variant="outline"
              className="w-full justify-start transition-all duration-300 hover:bg-amber-500/5 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/5 hover:-translate-y-0.5 group h-auto py-2.5 rounded-xl border-border/40"
              onClick={() => onSliderTypeChange('performance')}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mr-3.5 transition-transform group-hover:scale-110 group-hover:bg-amber-500/15">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm">Performance</div>
                <div className="text-xs text-muted-foreground/70">Metrics & analytics</div>
              </div>
            </Button>

            <div className="my-4" />
            
            <h3 className="text-xs font-semibold text-muted-foreground/80 mb-2 mt-4 uppercase tracking-wider">Management</h3>

            <Button
              size="default"
              variant="outline"
              className="w-full justify-start transition-all duration-300 hover:bg-orange-500/5 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500/30 hover:shadow-md hover:shadow-orange-500/5 hover:-translate-y-0.5 group h-auto py-2.5 rounded-xl border-border/40"
              onClick={onDeactivateClick}
            >
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center mr-3.5 transition-transform group-hover:scale-110 group-hover:bg-orange-500/15">
                <Power className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm">Deactivate</div>
                <div className="text-xs text-muted-foreground/70">Pause agent instance</div>
              </div>
            </Button>

            <Button
              size="default"
              variant="outline"
              className="w-full justify-start transition-all duration-300 hover:bg-red-500/5 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/30 hover:shadow-md hover:shadow-red-500/5 hover:-translate-y-0.5 group h-auto py-2.5 rounded-xl border-border/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              onClick={onDeleteClick}
              disabled={agent.status === 'active'}
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mr-3.5 transition-transform group-hover:scale-110 group-hover:bg-red-500/15">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm">Delete Instance</div>
                <div className="text-xs text-muted-foreground/70">
                  {agent.status === 'active' 
                    ? 'Deactivate first to delete' 
                    : 'Permanently remove'}
                </div>
              </div>
            </Button>
          </div>
        </div>
      </SheetContent>
    );
  }

  if (sliderType === 'actions' && agent.status === 'inactive') {
    return (
      <SheetContent className="flex flex-col p-0 border-l border-border/40 backdrop-blur-xl bg-background/95">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-6">
            <IconAvatar icon={Bot} variant={agent.variant} size="lg" rounded="lg" />
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold whitespace-normal break-words tracking-tight">{agent.name}</SheetTitle>
              <SheetDescription className="text-sm mt-1 whitespace-normal break-words leading-relaxed">
                {agent.description}
              </SheetDescription>
              <div className="flex items-start gap-2 mt-2 flex-wrap">
                <Badge 
                  variant={AGENT_STATUS_CONFIG[agent.status].variant}
                  className={`${AGENT_STATUS_CONFIG[agent.status].colors.badge} shadow-sm`}
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {AGENT_STATUS_CONFIG[agent.status].label}
                </Badge>
                <Badge variant="outline" className="text-xs whitespace-normal break-words bg-slate-50/80 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                  {agent.template}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <Separator className="opacity-60" />

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-50/80 to-yellow-50/80 dark:from-yellow-950/20 dark:to-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Agent Deactivated</h4>
                  <p className="text-xs text-amber-700/90 dark:text-amber-300/80 leading-relaxed mt-0.5">
                    This agent is currently inactive. Activate it to enable conversations, tasks, and other capabilities.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-muted-foreground/80 mb-3 uppercase tracking-wider">Available Actions</h3>
              
              <Button
                size="default"
                variant="default"
                className="w-full justify-start transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group h-auto py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/90"
                onClick={onActivateClick}
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mr-3.5 transition-transform group-hover:scale-110">
                  <Power className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">Activate Agent</div>
                  <div className="text-xs opacity-90">Start this instance</div>
                </div>
              </Button>

              <div className="my-4" />

              <h3 className="text-xs font-semibold text-muted-foreground/80 mb-2 mt-4 uppercase tracking-wider">Management</h3>

              <Button
                size="default"
                variant="outline"
                className="w-full justify-start transition-all duration-300 hover:bg-red-500/5 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/30 hover:shadow-md hover:shadow-red-500/5 hover:-translate-y-0.5 group h-auto py-2.5 rounded-xl border-border/40"
                onClick={onDeleteClick}
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mr-3.5 transition-transform group-hover:scale-110 group-hover:bg-red-500/15">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">Delete Instance</div>
                  <div className="text-xs text-muted-foreground/70">Permanently remove</div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    );
  }

  // Configure, Activity, Performance panels would go in separate components
  // For brevity, returning null for other slider types here
  return null;
}
