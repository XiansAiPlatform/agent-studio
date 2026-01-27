/**
 * Knowledge API types and utilities
 */

// Individual knowledge item at any scope level
export interface KnowledgeItem {
  id: string;
  agent: string;
  tenantId: string | null;
  createdBy: string;
  name: string;
  content: string;
  type: 'text' | 'markdown' | 'json';
  version: string;
  createdAt: string;
  systemScoped: boolean;
  activationName: string | null;
  permissionLevel: 'view' | 'edit';
}

// A knowledge group showing the hierarchy of overrides
export interface KnowledgeGroup {
  name: string;
  system_scoped: KnowledgeItem | null;
  tenant_default: KnowledgeItem | null;
  activations: KnowledgeItem[];
}

// API response structure
export interface KnowledgeApiResponse {
  groups: KnowledgeGroup[];
}

// Scope level for display
export type KnowledgeScopeLevel = 'system' | 'tenant' | 'activation';

// Helper to determine the effective (active) scope level
export function getEffectiveScopeLevel(group: KnowledgeGroup): KnowledgeScopeLevel {
  if (group.activations.length > 0) {
    return 'activation';
  }
  if (group.tenant_default) {
    return 'tenant';
  }
  return 'system';
}

// Helper to get the effective knowledge item
export function getEffectiveKnowledge(group: KnowledgeGroup): KnowledgeItem | null {
  if (group.activations.length > 0) {
    return group.activations[0];
  }
  if (group.tenant_default) {
    return group.tenant_default;
  }
  return group.system_scoped;
}

// Scope level metadata for display
export const SCOPE_LEVEL_CONFIG = {
  system: {
    label: 'System',
    description: 'Base system-level configuration',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
  tenant: {
    label: 'Organization',
    description: 'Tenant-level override',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  activation: {
    label: 'Agent',
    description: 'Agent-specific override',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  },
} as const;
