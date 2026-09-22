/**
 * Pure per-agent edit policy shared by API gates and client UX.
 *
 * Precedence:
 * 1. TenantAdmin / SysAdmin (`canEditAll`) — always edit
 * 2. Explicit grant on the agent — Write/Owner edit; Read does not
 * 3. No grant + agent-operator role (Participant Admin / Developer) — role default write
 * 4. Otherwise — no edit
 */

import { decodeAgentNameParam } from '@/lib/xians/agent-name'

export type AgentLevel = 'Read' | 'Write' | 'Owner'

export interface AgentEditPolicy {
  canEditAll: boolean
  /**
   * Participant Admin / Developer: when an agent has no explicit grant for this
   * user, they still get write-level access from their tenant role.
   */
  roleDefaultWrite: boolean
  /** Explicit per-agent grants, keyed by normalized agent name. */
  levels: Record<string, AgentLevel>
}

export function mayEditAgent(
  access: AgentEditPolicy,
  agentName: string | null | undefined
): boolean {
  if (!agentName) return false
  if (access.canEditAll) return true

  const canonical = decodeAgentNameParam(agentName)
  const level = access.levels[canonical]
  if (level === 'Write' || level === 'Owner') return true
  if (level === 'Read') return false
  return access.roleDefaultWrite
}
