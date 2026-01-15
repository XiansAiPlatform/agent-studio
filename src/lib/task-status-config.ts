// Centralized task status configuration for consistent styling across the application

export type TaskStatus = 'pending' | 'approved' | 'rejected' | 'obsolete';

export const TASK_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    colors: {
      // Badge colors
      badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
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
      badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      bar: 'bg-green-500/60 dark:bg-green-400/60',
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    variant: 'secondary' as const,
  },
  rejected: {
    label: 'Rejected',
    colors: {
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      bar: 'bg-red-500/60 dark:bg-red-400/60',
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
    variant: 'secondary' as const,
  },
  obsolete: {
    label: 'Obsolete',
    colors: {
      badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      bar: 'bg-gray-500/60 dark:bg-gray-400/60',
      text: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-800',
    },
    variant: 'secondary' as const,
  },
} as const;
