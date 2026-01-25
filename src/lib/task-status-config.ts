// Centralized task status configuration for consistent styling across the application

export type TaskStatus = 'pending' | 'approved' | 'rejected' | 'obsolete';

export const TASK_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    colors: {
      // Badge colors with border
      badge: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/50',
      // Stats bar color
      bar: 'bg-yellow-500/60 dark:bg-yellow-400/60',
      // Text colors for various uses
      text: 'text-yellow-600 dark:text-yellow-400',
      // Background colors
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    },
    variant: 'secondary' as const,
  },
  approved: {
    label: 'Approved',
    colors: {
      badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
      bar: 'bg-green-500/60 dark:bg-green-400/60',
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    variant: 'secondary' as const,
  },
  rejected: {
    label: 'Rejected',
    colors: {
      badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50',
      bar: 'bg-red-500/60 dark:bg-red-400/60',
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
    variant: 'secondary' as const,
  },
  obsolete: {
    label: 'Obsolete',
    colors: {
      badge: 'bg-muted/50 text-muted-foreground border-border dark:bg-muted/30 dark:text-muted-foreground dark:border-border',
      bar: 'bg-gray-500/60 dark:bg-gray-400/60',
      text: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-muted/50 dark:bg-muted/30',
    },
    variant: 'secondary' as const,
  },
} as const;
