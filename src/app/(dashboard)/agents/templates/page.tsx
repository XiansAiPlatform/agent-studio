'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Bot, Play, FileText, Zap, MessageSquare, Database, Code, Settings, Sparkles } from 'lucide-react';

const agentTemplates = [
  {
    id: 1,
    name: 'Client Support Agent',
    description: 'Pre-configured agent for handling customer inquiries and support tickets',
    category: 'Support',
    icon: MessageSquare,
    color: 'primary',
    features: ['Natural language processing', 'Ticket management', 'Multi-language support'],
    popular: true,
  },
  {
    id: 2,
    name: 'Data Analysis Agent',
    description: 'Processes and analyzes business data with automated insights',
    category: 'Analytics',
    icon: Database,
    color: 'secondary',
    features: ['Data processing', 'Report generation', 'Trend analysis'],
    popular: true,
  },
  {
    id: 3,
    name: 'Email Marketing Agent',
    description: 'Manages and optimizes email campaigns with smart automation',
    category: 'Marketing',
    icon: Bot,
    color: 'accent',
    features: ['Campaign optimization', 'A/B testing', 'Personalization'],
    popular: false,
  },
  {
    id: 4,
    name: 'Code Review Agent',
    description: 'Automated code review and quality assurance assistant',
    category: 'Development',
    icon: Code,
    color: 'primary',
    features: ['Code analysis', 'Best practices', 'Security scanning'],
    popular: true,
  },
  {
    id: 5,
    name: 'Content Writer Agent',
    description: 'Creates and optimizes content for blogs, social media, and more',
    category: 'Content',
    icon: FileText,
    color: 'secondary',
    features: ['SEO optimization', 'Multi-format support', 'Tone adaptation'],
    popular: false,
  },
  {
    id: 6,
    name: 'Process Automation Agent',
    description: 'Automates repetitive tasks and workflow processes',
    category: 'Automation',
    icon: Zap,
    color: 'accent',
    features: ['Workflow automation', 'Task scheduling', 'Integration support'],
    popular: true,
  },
];

type AgentTemplate = typeof agentTemplates[number];

export default function AgentTemplatesPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [maxConcurrentTasks, setMaxConcurrentTasks] = useState('5');
  const [responseTimeout, setResponseTimeout] = useState('30');

  const handleActivateClick = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setAgentName(template.name);
    setAgentDescription(template.description);
    setIsSheetOpen(true);
  };

  const handleActivateAgent = () => {
    // Here you would typically call an API to activate the agent
    console.log('Activating agent:', {
      template: selectedTemplate,
      name: agentName,
      description: agentDescription,
      maxConcurrentTasks,
      responseTimeout,
    });
    
    // Close the sheet and reset
    setIsSheetOpen(false);
    // You might want to show a success message or redirect to the agents page
  };
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Agent Templates</h1>
          <p className="text-muted-foreground mt-1">
            Choose a template to activate a new agent
          </p>
        </div>
        <Button variant="outline" className="transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/50" asChild>
          <Link href="/agents">
            View Active Agents
          </Link>
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agentTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <Card key={template.id} className="hover:shadow-md transition-shadow relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-md bg-${template.color}/10 flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 text-${template.color}`} />
                  </div>
                  <Badge variant="secondary" className="text-white">{template.category}</Badge>
                </div>
                <CardTitle className="mt-4">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Key Features:</p>
                    <ul className="space-y-1">
                      {template.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start">
                          <span className="mr-2">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button 
                    className="w-full group transition-all hover:shadow-md hover:scale-[1.02]"
                    onClick={() => handleActivateClick(template)}
                  >
                    <Play className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                    Activate This Agent
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Agent Configuration Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configure Agent
            </SheetTitle>
            <SheetDescription>
              Customize your agent settings before activation
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-6 py-6">
            {/* Template Info */}
            {selectedTemplate && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-md bg-${selectedTemplate.color}/10 flex items-center justify-center flex-shrink-0`}>
                    {selectedTemplate.icon && <selectedTemplate.icon className={`h-5 w-5 text-${selectedTemplate.color}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{selectedTemplate.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Template: {selectedTemplate.category}
                    </p>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Template
                  </Badge>
                </div>
              </div>
            )}

            {/* Agent Name */}
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                placeholder="Enter agent name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A unique name to identify this agent
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="agent-description">Description</Label>
              <Input
                id="agent-description"
                placeholder="Enter description"
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Brief description of what this agent does
              </p>
            </div>

            {/* Configuration Options */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium">Configuration</h4>
              
              {/* Max Concurrent Tasks */}
              <div className="space-y-2">
                <Label htmlFor="max-tasks">Max Concurrent Tasks</Label>
                <Input
                  id="max-tasks"
                  type="number"
                  min="1"
                  max="20"
                  value={maxConcurrentTasks}
                  onChange={(e) => setMaxConcurrentTasks(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of tasks this agent can handle simultaneously
                </p>
              </div>

              {/* Response Timeout */}
              <div className="space-y-2">
                <Label htmlFor="timeout">Response Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min="10"
                  max="300"
                  value={responseTimeout}
                  onChange={(e) => setResponseTimeout(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum time to wait for agent response
                </p>
              </div>
            </div>

            {/* Features Preview */}
            {selectedTemplate && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-medium">Included Features</h4>
                <ul className="space-y-1.5">
                  {selectedTemplate.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start">
                      <span className="mr-2 text-primary">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <SheetFooter>
            <div className="flex gap-3 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleActivateAgent}
                disabled={!agentName.trim()}
              >
                <Play className="mr-2 h-4 w-4" />
                Activate Agent
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
