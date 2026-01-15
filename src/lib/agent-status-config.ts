// Centralized agent status configuration for consistent styling across the application

export type AgentStatus = 'active' | 'paused' | 'error';

export const AGENT_STATUS_CONFIG = {
  active: {
    label: 'Active',
    colors: {
      badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    variant: 'default' as const,
  },
  paused: {
    label: 'Paused',
    colors: {
      badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
      text: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
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
