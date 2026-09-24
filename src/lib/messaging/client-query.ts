import { VIEW_AS_PARTICIPANT_QUERY_PARAM } from '@/lib/messaging/view-as-constants'

/** Append view-as participant id for admin read-only messaging fetches. */
export function appendViewAsParticipantId(
  params: URLSearchParams,
  viewAsParticipantId: string | null | undefined
): void {
  const trimmed = viewAsParticipantId?.trim()
  // Blank/null is a no-op so callers can pass an unset view-as without branching.
  if (!trimmed) return
  params.set(VIEW_AS_PARTICIPANT_QUERY_PARAM, trimmed)
}
