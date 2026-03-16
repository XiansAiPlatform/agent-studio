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

// Scope level metadata for display — theme tokens ensure consistent styling across all themes
export const SCOPE_LEVEL_CONFIG = {
  system: {
    label: 'System',
    description: 'Base system-level configuration',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    badgeColor: 'bg-primary/10 text-primary border-primary/20',
  },
  tenant: {
    label: 'Organization',
    description: 'Tenant-level override',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    badgeColor: 'bg-primary/10 text-primary border-primary/20',
  },
  activation: {
    label: 'Agent',
    description: 'Agent-specific override',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    badgeColor: 'bg-primary/10 text-primary border-primary/20',
  },
} as const;
