/**
 * Single source of truth for role identifiers and their human-readable labels.
 *
 * Backend (Xians) roles:
 * - SysAdmin: a global platform flag (exposed as `isSystemAdmin`), not a tenant
 *   participant role.
 * - TenantAdmin / TenantUser / TenantParticipantAdmin / TenantParticipant:
 *   per-tenant participant roles.
 *
 * Fine-grained, UI-level authorization is expressed in terms of capabilities
 * (see `./capabilities`). This module only defines the canonical role names and
 * labels that the admin UIs use for assignment and display, so they are not
 * duplicated across features.
 */

/** Roles that can be assigned to a user within a tenant (everything except SysAdmin). */
export const TENANT_ROLES = [
  'TenantAdmin',
  'TenantUser',
  'TenantParticipantAdmin',
  'TenantParticipant',
] as const

/** All assignable roles. SysAdmin is a global flag that only a system admin may grant. */
export const ALL_ROLES = ['SysAdmin', ...TENANT_ROLES] as const

export type TenantRole = (typeof TENANT_ROLES)[number]
export type Role = (typeof ALL_ROLES)[number]

/** Human-readable labels for each role. */
export const ROLE_LABELS: Record<Role, string> = {
  SysAdmin: 'System Admin',
  TenantAdmin: 'Tenant Admin',
  TenantUser: 'Developer',
  TenantParticipantAdmin: 'Participant Admin',
  TenantParticipant: 'Participant',
}

/** Labels restricted to the tenant-assignable roles (SysAdmin excluded). */
export const TENANT_ROLE_LABELS: Record<TenantRole, string> = {
  TenantAdmin: ROLE_LABELS.TenantAdmin,
  TenantUser: ROLE_LABELS.TenantUser,
  TenantParticipantAdmin: ROLE_LABELS.TenantParticipantAdmin,
  TenantParticipant: ROLE_LABELS.TenantParticipant,
}

export type RoleMetadata = {
  scope: string
  /** One-line summary for inline UI and native title attributes. */
  summary: string
  /** Fuller "what they can do" description for the role reference dialog. */
  description: string
  typicalUser: string
}

/**
 * Product-facing details for each role. Used by role-assignment UIs so copy is
 * not duplicated across Tenant Settings and System Admin.
 */
export const ROLE_METADATA: Record<Role, RoleMetadata> = {
  TenantParticipant: {
    scope: 'Per tenant',
    summary:
      'Engage with agents and complete HITL tasks. No configuration or admin access.',
    description:
      'Engage with agents — converse with them and complete Human-in-the-Loop (HITL) tasks assigned to them. No configuration access and no admin sidebar.',
    typicalUser: 'Business users, end customers',
  },
  TenantParticipantAdmin: {
    scope: 'Per tenant',
    summary:
      'Everything a Participant can do, plus full agent-level operations access.',
    description:
      'Everything a Participant can do, plus full access to agent-level operations: Agent Store, Knowledge Base, Data Explorer, Connections, Schedules, Performance, Activity Logs, and Secrets. Cannot manage tenant users.',
    typicalUser: 'Agent operators, ops leads',
  },
  TenantUser: {
    scope: 'Per tenant',
    summary:
      'Same agent-level access as Participant Admin, plus the Developer area (API keys).',
    description:
      'Same agent-level access as Participant Admin, plus access to the Developer area (API keys). Intended for developers building on the platform.',
    typicalUser: 'Developers, integrators',
  },
  TenantAdmin: {
    scope: 'Per tenant',
    summary:
      'Everything a Developer can do, plus user management and Tenant Admin settings.',
    description:
      'Everything a Developer can do, plus user management: invite/remove tenant users and configure Tenant Admin settings (Branding, OIDC Providers).',
    typicalUser: 'Tenant owner, platform admin',
  },
  SysAdmin: {
    scope: 'Platform-wide (global flag)',
    summary:
      'All capabilities across every tenant. Independent of tenant roles.',
    description:
      'All capabilities across every tenant: system-wide tenant and user management, and every agent-level and admin capability in any tenant. Independent of tenant roles — a SysAdmin is not automatically a participant in any tenant.',
    typicalUser: 'Platform operators, infrastructure admins',
  },
}

export function roleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] ?? role
}

export function roleSummary(role: string): string {
  return (ROLE_METADATA as Record<string, RoleMetadata>)[role]?.summary ?? ''
}
