/** Query param for system-admin read-only "view as participant" on messaging GET APIs. */
export const VIEW_AS_PARTICIPANT_QUERY_PARAM = 'viewAsParticipantId'

/** Defense-in-depth: topic create/delete must no-op while view-as is active. */
export function isViewAsTopicMutationBlocked(isViewAsReadOnly: boolean): boolean {
  return isViewAsReadOnly
}

export function getViewAsParticipantIdFromSearchParams(
  searchParams: URLSearchParams
): string | null {
  const raw = searchParams.get(VIEW_AS_PARTICIPANT_QUERY_PARAM)?.trim()
  return raw || null
}
