import { NextResponse } from 'next/server'
import { forbiddenError } from '@/lib/api/error-handler'
import { VIEW_AS_PARTICIPANT_QUERY_PARAM } from '@/lib/messaging/view-as-constants'

const VIEW_AS_FORBIDDEN_MESSAGE =
  'View-as participant mode is read-only and not supported for this operation'

/** Reject mutation routes that attempt to pass view-as (query or JSON body). */
export function rejectClientViewAsParameter(
  searchParams: URLSearchParams,
  body?: Record<string, unknown> | null
): NextResponse | null {
  if (searchParams.has(VIEW_AS_PARTICIPANT_QUERY_PARAM)) {
    return forbiddenError(VIEW_AS_FORBIDDEN_MESSAGE)
  }
  if (body && VIEW_AS_PARTICIPANT_QUERY_PARAM in body) {
    return forbiddenError(VIEW_AS_FORBIDDEN_MESSAGE)
  }
  return null
}
