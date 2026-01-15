import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Play, FileText, Zap, MessageSquare, Database, Code } from 'lucide-react';

const agentTemplates = [
  {
    id: 1,
    name: 'Customer Support Agent',
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

export default function AgentTemplatesPage() {
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
        <Button variant="outline" asChild>
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
              {template.popular && (
                <div className="absolute -top-2 -right-2 z-10">
                  <Badge className="bg-orange-500 text-white">Popular</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-md bg-${template.color}/10 flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 text-${template.color}`} />
                  </div>
                  <Badge variant="secondary">{template.category}</Badge>
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
                  <Button className="w-full">
                    <Play className="mr-2 h-4 w-4" />
                    Activate This Agent
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom Template Option */}
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle>Create Custom Agent</CardTitle>
          <CardDescription>
            Build your own agent from scratch with custom configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            <Bot className="mr-2 h-4 w-4" />
            Start From Scratch
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
