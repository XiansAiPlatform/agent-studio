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
/** When totalCount is missing, fetch remaining pages in small parallel batches. */
const MEMBERSHIP_PAGE_BATCH = 3

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

/** Shape check only; tenant membership is the real validation boundary. */
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
  viewAsParticipantId: string,
  agentName?: string | null,
  activationName?: string | null
): string {
  return [
    tenantId,
    adminEmail.trim().toLowerCase(),
    viewAsParticipantId.trim().toLowerCase(),
    (agentName ?? '').trim().toLowerCase(),
    (activationName ?? '').trim().toLowerCase(),
  ].join(':')
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

function pageSizeOf(page: TenantUsersPage): number {
  return page.pageSize ?? MEMBERSHIP_PAGE_SIZE
}

function isShortUsersPage(page: TenantUsersPage): boolean {
  return (page.users ?? []).length < pageSizeOf(page)
}

/** Known last page from totalCount, or 1 when page 1 is short. Null = keep paging in batches. */
function knownLastMembershipPage(first: TenantUsersPage): number | null {
  const pageSize = pageSizeOf(first)
  if (typeof first.totalCount === 'number' && pageSize > 0) {
    return Math.min(Math.max(1, Math.ceil(first.totalCount / pageSize)), MEMBERSHIP_MAX_PAGES)
  }
  if (isShortUsersPage(first)) return 1
  return null
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

  const knownLast = knownLastMembershipPage(first)
  if (knownLast !== null && knownLast <= 1) return false

  const cap = knownLast ?? MEMBERSHIP_MAX_PAGES
  let next = 2
  while (next <= cap) {
    const batchEnd = Math.min(next + MEMBERSHIP_PAGE_BATCH - 1, cap)
    const pages = await Promise.all(
      Array.from({ length: batchEnd - next + 1 }, (_, i) => fetchPage(next + i))
    )
    if (pages.some((page) => tenantUsersPageContainsEmail(page, needle))) {
      return true
    }
    if (knownLast === null && pages.some(isShortUsersPage)) {
      return false
    }
    next = batchEnd + 1
  }
  return false
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

export class TenantMembershipLookupError extends Error {
  readonly cause: unknown

  constructor(cause: unknown) {
    super('Failed to verify tenant membership')
    this.name = 'TenantMembershipLookupError'
    this.cause = cause
  }
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
    throw new TenantMembershipLookupError(error)
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

  let isMember: boolean
  try {
    isMember = await isEmailTenantMember(
      options.tenantId,
      viewAsTarget,
      options.accessToken
    )
  } catch (error) {
    if (error instanceof TenantMembershipLookupError) {
      return NextResponse.json(
        {
          error: 'Unable to verify tenant membership; try again',
          code: 'membership_unavailable',
        },
        { status: 503 }
      )
    }
    throw error
  }
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
 * Audit record when an admin enters view-as mode.
 * Idempotent per admin+target+tenant+agent+activation.
 * Studio has no local audit store; fail-open with console.error so a missing
 * upstream POST does not block the read (topics/history stay usable).
 */
export async function recordConversationViewAsAudit(
  payload: ConversationViewAsAuditPayload,
  accessToken?: string
): Promise<void> {
  const key = viewAsAuditCacheKey(
    payload.tenantId,
    payload.adminEmail,
    payload.viewAsParticipantId,
    payload.agentName,
    payload.activationName
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
