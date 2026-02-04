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
  Database,
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
      <SheetContent className="flex flex-col p-0 border-l border-border/40 backdrop-blur-xl bg-white dark:bg-gray-950 sm:max-w-lg">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <IconAvatar icon={Bot} variant={agent.variant} size="md" rounded="full" pulse={true} />
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold whitespace-normal break-words">{agent.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant={AGENT_STATUS_CONFIG[agent.status].variant}
                  className={`${AGENT_STATUS_CONFIG[agent.status].colors.badge} text-xs`}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {AGENT_STATUS_CONFIG[agent.status].label}
                </Badge>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{agent.template}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Agent Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {agent.description}
            </p>

            <Separator className="opacity-40" />
            {/* Main Actions - More Fluid */}
            <div className="space-y-2">
              <Link 
                href={`/conversations/${encodeURIComponent(agent.template)}/${encodeURIComponent(agent.name)}?topic=general-discussions`}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
              >
                <MessageSquare className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm group-hover:text-primary transition-colors">Talk to Agent</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Start a conversation and get instant responses</p>
                </div>
              </Link>
              
              <Link 
                href={`/tasks?status=pending&agent=${encodeURIComponent(agent.template)}&activation=${encodeURIComponent(agent.name)}`}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-blue-500/5 transition-colors cursor-pointer"
              >
                <ListTodo className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">View Tasks</div>
                  <p className="text-xs text-muted-foreground mt-0.5">See all tasks and track progress</p>
                </div>
              </Link>
              <Separator className="opacity-40" />

            </div>



            {/* Secondary Actions - Simplified */}
            <div className="space-y-1">
              <button
                onClick={() => onSliderTypeChange('configure')}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer w-full text-left"
              >
                <Settings className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Configuration</span>
              </button>
              <Link 
                href={`https://studio.agentri.ai/settings/database?agentName=${encodeURIComponent(agent.template)}&activationName=${encodeURIComponent(agent.name)}`}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <Database className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Explore Data</span>
              </Link>
              <Link 
                href={`/knowledge?agentName=${encodeURIComponent(agent.template)}&activationName=${encodeURIComponent(agent.name)}`}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Knowledge</span>
              </Link>

              <Link
                href={`/settings/logs?agent=${encodeURIComponent(agent.template)}&activation=${encodeURIComponent(agent.name)}`}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer w-full text-left"
              >
                <Activity className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Activity Logs</span>
              </Link>
              
              <button
                onClick={() => onSliderTypeChange('performance')}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer w-full text-left"
              >
                <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Performance</span>
              </button>
            </div>

            <Separator className="opacity-40" />
            
            {/* Management - More Fluid */}
            <div className="space-y-2">
              <button
                onClick={onDeactivateClick}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-orange-500/5 transition-colors cursor-pointer w-full text-left"
              >
                <Power className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Deactivate</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Pause this agent instance</p>
                </div>
              </button>

              <button
                onClick={onDeleteClick}
                disabled={agent.status === 'active'}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-red-500/5 transition-colors cursor-pointer w-full text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Delete Instance</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {agent.status === 'active' 
                      ? 'Deactivate first to delete' 
                      : 'Permanently remove this agent'}
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
      <SheetContent className="flex flex-col p-0 border-l border-border/40 backdrop-blur-xl bg-white dark:bg-gray-950 sm:max-w-lg">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <IconAvatar icon={Bot} variant={agent.variant} size="md" rounded="full" />
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold whitespace-normal break-words">{agent.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant={AGENT_STATUS_CONFIG[agent.status].variant}
                  className={`${AGENT_STATUS_CONFIG[agent.status].colors.badge} text-xs`}
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {AGENT_STATUS_CONFIG[agent.status].label}
                </Badge>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{agent.template}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Agent Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {agent.description}
            </p>

            <Separator className="opacity-40" />
            {/* Info Notice - More Organic */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/30">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Agent Deactivated</p>
                <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-1 leading-relaxed">
                  This agent is currently inactive. Activate it to enable conversations, tasks, and other capabilities.
                </p>
              </div>
            </div>

            {/* Primary Action */}
            <Button
              size="lg"
              variant="default"
              className="w-full justify-start h-auto py-3 px-4 rounded-lg"
              onClick={onActivateClick}
            >
              <Power className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold text-sm">Activate Agent</div>
                <div className="text-xs opacity-90">Start this instance and begin working</div>
              </div>
            </Button>

            <Separator className="opacity-40" />
            
            {/* Management */}
            <div className="space-y-2">
              <button
                onClick={onDeleteClick}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-red-500/5 transition-colors cursor-pointer w-full text-left"
              >
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Delete Instance</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Permanently remove this agent</p>
                </div>
              </button>
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
