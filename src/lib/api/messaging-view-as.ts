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
import { createTtlCache } from '@/lib/xians/cache'
import {
  getViewAsParticipantIdFromSearchParams,
} from '@/lib/messaging/view-as-constants'

/** Collapse repeated membership lookups (history + topics + polls) for the same pair. */
export const TENANT_MEMBERSHIP_TTL_MS = 10_000

/** Collapse repeated system-admin checks (history + topics share the same session). */
export const SYSTEM_ADMIN_CHECK_TTL_MS = 10_000

/** One audit record per admin+target+tenant; long enough to cover a view-as session. */
export const VIEW_AS_AUDIT_IDEMPOTENCY_TTL_MS = 60 * 60 * 1000

const MEMBERSHIP_PAGE_SIZE = 100
const MEMBERSHIP_MAX_PAGES = 10

const tenantMembershipCache = createTtlCache<boolean>(TENANT_MEMBERSHIP_TTL_MS)
const systemAdminCache = createTtlCache<boolean>(SYSTEM_ADMIN_CHECK_TTL_MS)
const viewAsAuditCache = createTtlCache<true>(VIEW_AS_AUDIT_IDEMPOTENCY_TTL_MS)

export function resetMessagingViewAsCachesForTests(): void {
  tenantMembershipCache.clear()
  systemAdminCache.clear()
  viewAsAuditCache.clear()
}

function normalizeParticipantEmail(value: string): string {
  return value.trim()
}

function isPlausibleParticipantEmail(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 320) return false
  const at = trimmed.indexOf('@')
  return at > 0 && at < trimmed.length - 1
}

function tenantMembershipCacheKey(tenantId: string, email: string): string {
  return `${tenantId}:${email.trim().toLowerCase()}`
}

function viewAsAuditCacheKey(
  tenantId: string,
  adminEmail: string,
  viewAsParticipantId: string
): string {
  return `${tenantId}:${adminEmail.trim().toLowerCase()}:${viewAsParticipantId.trim().toLowerCase()}`
}

type TenantUsersPage = {
  users?: unknown[]
  totalCount?: number
  page?: number
  pageSize?: number
}

function tenantUsersPageContainsEmail(data: TenantUsersPage, needle: string): boolean {
  return (data.users ?? [])
    .map((u) => normalizeTenantUser(u))
    .some((u) => u.email.trim().toLowerCase() === needle)
}

function membershipTotalPages(first: TenantUsersPage): number {
  const pageSize = first.pageSize ?? MEMBERSHIP_PAGE_SIZE
  const firstCount = (first.users ?? []).length
  if (typeof first.totalCount === 'number' && pageSize > 0) {
    return Math.max(1, Math.ceil(first.totalCount / pageSize))
  }
  if (firstCount < pageSize) return 1
  return MEMBERSHIP_MAX_PAGES
}

async function fetchIsEmailTenantMember(
  tenantId: string,
  email: string,
  accessToken?: string
): Promise<boolean> {
  const client = createXiansClient(accessToken)
  const needle = email.toLowerCase()

  const fetchPage = (page: number) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(MEMBERSHIP_PAGE_SIZE),
      search: email,
    })
    return client.get<TenantUsersPage>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users?${params.toString()}`
    )
  }

  const first = await fetchPage(1)
  if (tenantUsersPageContainsEmail(first, needle)) {
    return true
  }

  const lastPage = Math.min(membershipTotalPages(first), MEMBERSHIP_MAX_PAGES)
  if (lastPage <= 1) return false

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, i) => fetchPage(i + 2))
  )
  return rest.some((page) => tenantUsersPageContainsEmail(page, needle))
}

async function requireCachedSystemAdmin(
  session: Session
): Promise<NextResponse | null> {
  const email = session.user?.email?.trim().toLowerCase()
  if (!email) {
    return unauthorizedError('User email not found in session')
  }

  const allowed = await systemAdminCache.get(email, async () => {
    return (await requireSystemAdmin(session)) === null
  })
  if (!allowed) {
    return forbiddenError('System administrator access required')
  }
  return null
}

export async function isEmailTenantMember(
  tenantId: string,
  email: string,
  accessToken?: string
): Promise<boolean> {
  const normalized = normalizeParticipantEmail(email)
  if (!isPlausibleParticipantEmail(normalized)) return false

  const key = tenantMembershipCacheKey(tenantId, normalized)
  try {
    return await tenantMembershipCache.get(key, () =>
      fetchIsEmailTenantMember(tenantId, normalized, accessToken)
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
 * Honoring view-as records an audit entry first (idempotent per admin+target+tenant).
 * If the upstream write is unavailable, the attempt is logged and the read still proceeds.
 * The Studio confirm dialog is not checked here — viewAsParticipantId in the query
 * is sufficient after the admin and membership checks below.
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

  const authError = await requireCachedSystemAdmin(options.session)
  if (authError) return authError

  if (!isPlausibleParticipantEmail(viewAsTarget)) {
    return validationError('viewAsParticipantId must be a valid email address')
  }

  const isMember = await isEmailTenantMember(
    options.tenantId,
    viewAsTarget,
    options.accessToken
  )
  if (!isMember) {
    return forbiddenError('Selected user is not a member of this tenant')
  }

  await recordConversationViewAsAudit(
    {
      tenantId: options.tenantId,
      adminEmail: sessionEmail,
      viewAsParticipantId: viewAsTarget,
      agentName: options.searchParams.get('agentName'),
      activationName: options.searchParams.get('activationName'),
    },
    options.accessToken
  )

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

/**
 * Audit record when an admin enters view-as mode. Idempotent per admin+target+tenant.
 * Upstream may not expose audit creation; console.error is the durable fallback so
 * the read is not blocked when the write is unavailable.
 */
export async function recordConversationViewAsAudit(
  payload: ConversationViewAsAuditPayload,
  accessToken?: string
): Promise<void> {
  const key = viewAsAuditCacheKey(
    payload.tenantId,
    payload.adminEmail,
    payload.viewAsParticipantId
  )

  try {
    await viewAsAuditCache.get(key, async () => {
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
      return true as const
    })
  } catch (error) {
    console.error('[Audit] conversation.view_as write failed', {
      tenantId: payload.tenantId,
      performedBy: payload.adminEmail,
      targetParticipantId: payload.viewAsParticipantId,
      error,
    })
  }
}
