/**
 * System-admin "view as participant" for messaging read APIs.
 *
 * Participant identity for normal users always comes from the session. Admins may
 * pass `viewAsParticipantId` on GET history/topics only after server-side checks.
 *
 * Server-only — do not import from client components (use `@/lib/messaging/view-as-constants`).
 */

import 'server-only'

import type { Session } from 'next-auth'
import { NextResponse } from 'next/server'
import { requireSystemAdmin } from '@/lib/api/auth'
import { forbiddenError, unauthorizedError, validationError } from '@/lib/api/error-handler'
import { normalizeTenantUser } from '@/app/(dashboard)/tenant-settings/users/types'
import { createXiansClient } from '@/lib/xians/client'
import {
  getViewAsParticipantIdFromSearchParams,
} from '@/lib/messaging/view-as-constants'

function normalizeParticipantEmail(value: string): string {
  return value.trim()
}

function isPlausibleParticipantEmail(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 320) return false
  const at = trimmed.indexOf('@')
  return at > 0 && at < trimmed.length - 1
}

export async function isEmailTenantMember(
  tenantId: string,
  email: string,
  accessToken?: string
): Promise<boolean> {
  const normalized = normalizeParticipantEmail(email)
  if (!isPlausibleParticipantEmail(normalized)) return false

  const client = createXiansClient(accessToken)
  const params = new URLSearchParams({
    page: '1',
    pageSize: '50',
    search: normalized,
  })

  try {
    const data = await client.get<{ users?: unknown[] }>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users?${params.toString()}`
    )
    const users = (data.users ?? []).map((u) => normalizeTenantUser(u))
    return users.some(
      (u) => u.email.trim().toLowerCase() === normalized.toLowerCase()
    )
  } catch (error) {
    console.error('[messaging-view-as] Failed to verify tenant membership:', error)
    return false
  }
}

export type ResolvedMessagingParticipant =
  | { participantId: string; viewAsActive: false }
  | {
      participantId: string
      viewAsActive: true
      viewAsTarget: string
      adminEmail: string
    }

export type ResolveMessagingParticipantResult =
  | NextResponse
  | ResolvedMessagingParticipant

/**
 * Resolve which participant's messaging data to read.
 * Default: session email. With view-as: system admin + tenant member target.
 */
export async function resolveMessagingParticipantId(options: {
  session: Session
  tenantId: string
  searchParams: URLSearchParams
  accessToken?: string
}): Promise<ResolveMessagingParticipantResult> {
  const sessionEmail = options.session.user?.email?.trim()
  if (!sessionEmail) {
    return unauthorizedError('User email not found in session')
  }

  const requestedViewAs = getViewAsParticipantIdFromSearchParams(options.searchParams)
  if (!requestedViewAs) {
    return { participantId: sessionEmail, viewAsActive: false }
  }

  const viewAsTarget = normalizeParticipantEmail(requestedViewAs)
  if (viewAsTarget.toLowerCase() === sessionEmail.toLowerCase()) {
    return { participantId: sessionEmail, viewAsActive: false }
  }

  if (!isPlausibleParticipantEmail(viewAsTarget)) {
    return validationError('viewAsParticipantId must be a valid email address')
  }

  const authError = await requireSystemAdmin(options.session)
  if (authError) return authError

  const isMember = await isEmailTenantMember(
    options.tenantId,
    viewAsTarget,
    options.accessToken
  )
  if (!isMember) {
    return forbiddenError('Selected user is not a member of this tenant')
  }

  return {
    participantId: viewAsTarget,
    viewAsActive: true,
    viewAsTarget,
    adminEmail: sessionEmail,
  }
}

export interface ConversationViewAsAuditPayload {
  tenantId: string
  adminEmail: string
  viewAsParticipantId: string
  agentName?: string | null
  activationName?: string | null
}

/** Best-effort audit record when an admin enters view-as mode. */
export async function recordConversationViewAsAudit(
  payload: ConversationViewAsAuditPayload,
  accessToken?: string
): Promise<void> {
  const entry = {
    action: 'conversation.view_as',
    tenantId: payload.tenantId,
    performedBy: payload.adminEmail,
    targetParticipantId: payload.viewAsParticipantId,
    agentName: payload.agentName ?? null,
    activationName: payload.activationName ?? null,
    timestamp: new Date().toISOString(),
  }

  console.info('[Audit] conversation.view_as', entry)

  const client = createXiansClient(accessToken)
  try {
    await client.post(
      `/api/v1/admin/tenants/${encodeURIComponent(payload.tenantId)}/audit-logs`,
      {
        action: entry.action,
        description: `System admin viewed conversations as ${payload.viewAsParticipantId}`,
        activationName: payload.activationName ?? undefined,
        details: {
          targetParticipantId: payload.viewAsParticipantId,
          agentName: payload.agentName,
        },
      }
    )
  } catch {
    // Upstream may not expose audit creation; console log remains the fallback.
  }
}
