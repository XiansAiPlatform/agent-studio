/** Query param for system-admin read-only "view as participant" on messaging GET APIs. */
export const VIEW_AS_PARTICIPANT_QUERY_PARAM = 'viewAsParticipantId'

export function getViewAsParticipantIdFromSearchParams(
  searchParams: URLSearchParams
): string | null {
  const raw = searchParams.get(VIEW_AS_PARTICIPANT_QUERY_PARAM)?.trim()
  return raw || null
}
