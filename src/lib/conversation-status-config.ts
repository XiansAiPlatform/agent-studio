// Centralized conversation status configuration for consistent styling

import { Activity, CheckCircle, Archive, Circle } from 'lucide-react';

export type TopicStatus = 'active' | 'resolved' | 'archived';
export type AgentStatus = 'online' | 'offline' | 'busy';

export const TOPIC_STATUS_CONFIG = {
  active: {
    label: 'Active',
    icon: Activity,
    colors: {
      text: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      icon: 'text-green-600 dark:text-green-400',
    },
    variant: 'secondary' as const,
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle,
    colors: {
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    variant: 'secondary' as const,
  },
  archived: {
    label: 'Archived',
    icon: Archive,
    colors: {
      text: 'text-gray-600 dark:text-gray-400',
      badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      icon: 'text-gray-600 dark:text-gray-400',
    },
    variant: 'secondary' as const,
  },
} as const;

export const AGENT_STATUS_CONFIG = {
  online: {
    label: 'Online',
    colors: {
      badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      dot: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
    },
    variant: 'secondary' as const,
  },
  offline: {
    label: 'Offline',
    colors: {
      badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      dot: 'bg-gray-400',
      text: 'text-gray-600 dark:text-gray-400',
    },
    variant: 'secondary' as const,
  },
  busy: {
    label: 'Busy',
    colors: {
      badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
      dot: 'bg-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
    },
    variant: 'secondary' as const,
  },
} as const;
