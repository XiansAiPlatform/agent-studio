import { XiansAgentTemplate, XiansAgentDeployment } from '@/lib/xians/types';

export type EnhancedDeployment = XiansAgentDeployment & {
  icon?: any;
  color?: string;
  activationCount?: number;
};

export type EnhancedTemplate = XiansAgentTemplate & {
  icon?: any;
  color?: string;
  workflowCount?: number;
};
