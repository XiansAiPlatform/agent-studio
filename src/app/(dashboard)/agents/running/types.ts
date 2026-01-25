import { AgentStatus } from '@/lib/agent-status-config';

export type Agent = {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  template: string;
  uptime?: string;
  lastActive?: string;
  tasksCompleted: number;
  variant: 'primary' | 'secondary' | 'accent';
  participantId?: string;
};

export type SliderType = 'actions' | 'configure' | 'activity' | 'performance' | null;
