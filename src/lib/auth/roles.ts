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

export function roleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] ?? role
}
