/**
 * Capability-based authorization model.
 *
 * Backend roles are coarse (a global `isSystemAdmin` flag plus per-tenant
 * participant roles). The frontend needs finer-grained, intention-revealing
 * authorization that can evolve independently of those roles. We therefore map
 * the backend role context into a set of capabilities ONCE, here, and every
 * guard (middleware, server layouts, API helpers, sidebar, UI) checks
 * capabilities instead of duplicating role-string comparisons.
 *
 * Capabilities are safe to expose to the client (unlike the raw participant
 * role, which stays server-side): they are a derived abstraction, not the
 * authoritative role.
 */

import type { XiansParticipantRole } from '@/lib/xians/types'

/**
 * Fine-grained capabilities the UI and route guards can require.
 *
 * Naming convention: `<area>:<action>`. Add new capabilities here as the
 * frontend grows finer-grained needs than the backend roles express.
 */
export type Capability =
  /** Render the full admin layout (sidebar) rather than the participant chat layout. */
  | 'app:use-full-layout'
  /** Access Agent Settings (`/settings/*`). */
  | 'settings:view'
  /** Access the Developer area (`/developer/*`). */
  | 'developer:access'
  /** Manage tenant users (`/tenant-settings/*`). */
  | 'tenant:manage-users'
  /** Customize the tenant theme. */
  | 'theme:customize'
  /** Platform-wide system administration (`/system-admin/*`). */
  | 'system:admin'

/** Every capability, granted to system administrators. */
export const ALL_CAPABILITIES: Capability[] = [
  'app:use-full-layout',
  'settings:view',
  'developer:access',
  'tenant:manage-users',
  'theme:customize',
  'system:admin',
]

/**
 * Capabilities granted by each tenant participant role.
 *
 * This matrix is the single place that decides what each role can do. It is
 * intentionally finer-grained than the backend roles: e.g. several distinct
 * participant roles map onto the same agent-level capabilities today, but can
 * diverge here without touching the backend.
 */
const ROLE_CAPABILITIES: Record<XiansParticipantRole, Capability[]> = {
  TenantParticipant: [],
  TenantParticipantAdmin: [
    'app:use-full-layout',
    'settings:view',
    'developer:access',
    'theme:customize',
  ],
  TenantUser: [
    'app:use-full-layout',
    'settings:view',
    'developer:access',
    'theme:customize',
  ],
  TenantAdmin: [
    'app:use-full-layout',
    'settings:view',
    'developer:access',
    'theme:customize',
    'tenant:manage-users',
  ],
}

export interface RoleContext {
  /** The user's participant role for the relevant tenant, if any. */
  participantRole?: XiansParticipantRole | null
  /** Whether the user is a global platform system administrator. */
  isSystemAdmin?: boolean | null
}

/**
 * Resolve the effective capability set for a role context. System admins always
 * receive every capability; otherwise the participant role's grants apply.
 */
export function getCapabilities(ctx: RoleContext): Capability[] {
  if (ctx.isSystemAdmin) {
    return [...ALL_CAPABILITIES]
  }
  if (!ctx.participantRole) {
    return []
  }
  return [...(ROLE_CAPABILITIES[ctx.participantRole] ?? [])]
}

/** Whether a resolved capability set includes the given capability. */
export function hasCapability(
  capabilities: Capability[] | undefined | null,
  capability: Capability
): boolean {
  return !!capabilities && capabilities.includes(capability)
}
