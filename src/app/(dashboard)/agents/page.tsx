'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  Play,
  MessageSquare,
  ListTodo,
  Settings,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { AgentStatus, AGENT_STATUS_CONFIG } from '@/lib/agent-status-config';

type Agent = {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  template: string;
  uptime?: string;
  lastActive?: string;
  tasksCompleted: number;
  bgColor: string;
  iconColor: string;
};

const agents: Agent[] = [
  {
    id: 'agent-001',
    name: 'Client Support Agent',
    description: 'Handles customer inquiries and support tickets',
    status: 'active',
    template: 'Customer Support',
    uptime: '24h 35m',
    tasksCompleted: 127,
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    id: 'agent-003',
    name: 'Data Analysis Agent',
    description: 'Processes and analyzes business data',
    status: 'paused',
    template: 'Data Analysis',
    lastActive: '2h ago',
    tasksCompleted: 45,
    bgColor: 'bg-secondary/10',
    iconColor: 'text-secondary',
  },
  {
    id: 'agent-002',
    name: 'Email Marketing Agent',
    description: 'Manages and optimizes email campaigns',
    status: 'active',
    template: 'Email Marketing',
    uptime: '12h 15m',
    tasksCompleted: 89,
    bgColor: 'bg-accent/10',
    iconColor: 'text-accent',
  },
];

type SliderType = 'configure' | 'activity' | 'performance' | null;

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [sliderType, setSliderType] = useState<SliderType>(null);

  const openSlider = (agent: Agent, type: SliderType) => {
    setSelectedAgent(agent);
    setSliderType(type);
  };

  const closeSlider = () => {
    setSliderType(null);
    setSelectedAgent(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Active Agent Instances</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your active AI agents
          </p>
        </div>
        <Button asChild>
          <Link href="/agents/templates">
            <Play className="mr-2 h-4 w-4" />
            Activate New Agent
          </Link>
        </Button>
      </div>

      {/* Agents Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`h-12 w-12 rounded-md ${agent.bgColor} flex items-center justify-center`}>
                  <Bot className={`h-6 w-6 ${agent.iconColor}`} />
                </div>
                <Badge 
                  variant={AGENT_STATUS_CONFIG[agent.status].variant}
                  className={AGENT_STATUS_CONFIG[agent.status].colors.badge}
                >
                  {AGENT_STATUS_CONFIG[agent.status].label}
                </Badge>
              </div>
              <CardTitle className="mt-4">{agent.name}</CardTitle>
              <CardDescription>{agent.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Template:</span>
                  <span className="font-medium">{agent.template}</span>
                </div>
                {agent.uptime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uptime:</span>
                    <span className="font-medium">{agent.uptime}</span>
                  </div>
                )}
                {agent.lastActive && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Active:</span>
                    <span className="font-medium">{agent.lastActive}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasks Completed:</span>
                  <span className="font-medium">{agent.tasksCompleted}</span>
                </div>

                <Separator className="my-3" />

                {/* Action Links */}
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/50 hover:translate-x-1 group"
                    asChild
                  >
                    <Link href={`/conversations?agent=${agent.id}`}>
                      <MessageSquare className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                      Talk to the Agent
                    </Link>
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start transition-all hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/50 hover:translate-x-1 group"
                    asChild
                  >
                    <Link href={`/tasks?agents=${encodeURIComponent(agent.name)}`}>
                      <ListTodo className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                      See Agent Tasks
                    </Link>
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start transition-all hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500/50 hover:translate-x-1 group"
                    asChild
                  >
                    <Link href={`/knowledge?agents=${encodeURIComponent(agent.name)}`}>
                      <BookOpen className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                      View Agent Knowledge
                    </Link>
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start transition-all hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-500/50 hover:translate-x-1 group"
                    onClick={() => openSlider(agent, 'configure')}
                  >
                    <Settings className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                    Configure
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start transition-all hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/50 hover:translate-x-1 group"
                    onClick={() => openSlider(agent, 'activity')}
                  >
                    <Activity className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                    Activity Logs
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start transition-all hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/50 hover:translate-x-1 group"
                    onClick={() => openSlider(agent, 'performance')}
                  >
                    <TrendingUp className="mr-2 h-4 w-4 transition-transform group-hover:scale-110 group-hover:translate-y-[-2px]" />
                    Performance
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Right Slider for Configure, Activity Logs, and Performance */}
      <Sheet open={sliderType !== null} onOpenChange={closeSlider}>
        <SheetContent className="flex flex-col p-0">
          {selectedAgent && (
            <>
              {sliderType === 'configure' && (
                <>
                  <SheetHeader>
                    <SheetTitle>Configure Agent</SheetTitle>
                    <SheetDescription>{selectedAgent.name}</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3">General Settings</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-muted-foreground">Agent Name</label>
                          <input
                            type="text"
                            defaultValue={selectedAgent.name}
                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Description</label>
                          <textarea
                            defaultValue={selectedAgent.description}
                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium mb-3">Behavior Settings</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Auto-respond to messages</span>
                          <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Enable task automation</span>
                          <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Learning mode</span>
                          <input type="checkbox" className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium mb-3">Response Settings</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-muted-foreground">Response delay (ms)</label>
                          <input
                            type="number"
                            defaultValue={500}
                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Max concurrent tasks</label>
                          <input
                            type="number"
                            defaultValue={5}
                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                          />
                        </div>
                      </div>
                    </div>

                      <div className="pt-4">
                        <Button className="w-full">Save Configuration</Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {sliderType === 'activity' && (
                <>
                  <SheetHeader>
                    <SheetTitle>Activity Logs</SheetTitle>
                    <SheetDescription>{selectedAgent.name}</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-4">
                    {[
                      {
                        time: '2 minutes ago',
                        type: 'success',
                        message: 'Completed task: Process customer inquiry #1234',
                      },
                      {
                        time: '15 minutes ago',
                        type: 'info',
                        message: 'Started conversation with user John Doe',
                      },
                      {
                        time: '1 hour ago',
                        type: 'success',
                        message: 'Completed task: Generate monthly report',
                      },
                      {
                        time: '2 hours ago',
                        type: 'warning',
                        message: 'Retry attempt for task #5678',
                      },
                      {
                        time: '3 hours ago',
                        type: 'success',
                        message: 'Processed 15 customer support tickets',
                      },
                      {
                        time: '5 hours ago',
                        type: 'info',
                        message: 'Agent started and initialized',
                      },
                    ].map((log, index) => (
                      <div key={index} className="flex gap-3 pb-3 border-b last:border-0">
                        <div className="flex-shrink-0 mt-1">
                          {log.type === 'success' && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          {log.type === 'info' && (
                            <Activity className="h-4 w-4 text-blue-600" />
                          )}
                          {log.type === 'warning' && (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{log.message}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.time}
                          </p>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                </>
              )}

              {sliderType === 'performance' && (
                <>
                  <SheetHeader>
                    <SheetTitle>Performance Metrics</SheetTitle>
                    <SheetDescription>{selectedAgent.name}</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3">Overall Performance</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Success Rate</span>
                          <span className="text-lg font-semibold text-green-600">98.5%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Avg Response Time</span>
                          <span className="text-lg font-semibold">1.2s</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Tasks Completed</span>
                          <span className="text-lg font-semibold">{selectedAgent.tasksCompleted}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium mb-3">Today's Statistics</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Messages Processed</span>
                          <span className="font-medium">234</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Tasks Completed</span>
                          <span className="font-medium">42</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Active Conversations</span>
                          <span className="font-medium">12</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Error Rate</span>
                          <span className="font-medium text-green-600">0.3%</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium mb-3">This Week</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Uptime</span>
                          <span className="font-medium">156h 24m</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Efficiency Trend</span>
                          <span className="font-medium text-green-600">↑ 2.5%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Peak Hours</span>
                          <span className="font-medium">9AM - 5PM</span>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
