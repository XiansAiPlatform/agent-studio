// Centralized agent status configuration for consistent styling across the application

export type AgentStatus = 'active' | 'inactive' | 'error';

export const AGENT_STATUS_CONFIG = {
  active: {
    label: 'Active',
    colors: {
      badge: 'bg-primary/15 text-primary dark:bg-primary/20',
      text: 'text-primary',
      bg: 'bg-primary/10',
    },
    variant: 'default' as const,
  },
  inactive: {
    label: 'Inactive',
    colors: {
      badge: 'bg-secondary text-secondary-foreground',
      text: 'text-muted-foreground',
      bg: 'bg-secondary/50',
    },
    variant: 'secondary' as const,
  },
  error: {
    label: 'Error',
    colors: {
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
    variant: 'destructive' as const,
  },
} as const;
