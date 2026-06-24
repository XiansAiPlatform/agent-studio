import type { XiansMessage } from '@/lib/xians/types';

/**
 * Frontend mirrors of the server feedback DTOs returned by the AdminFeedback
 * endpoints (see XiansAi.Server FeedbackQueryService / MessageFeedback models).
 */

/** Filters applied to feedback queries. All optional. */
export interface FeedbackFilters {
  agentName: string | null;
  /** 1-5, or null for any rating. */
  rating: number | null;
  /** ISO date string (inclusive). */
  startDate: string | null;
  /** ISO date string (inclusive). */
  endDate: string | null;
}

/** Number of feedback entries for a single star rating (1-5). */
export interface RatingCount {
  rating: number;
  count: number;
}

/** Number of feedback entries for a single reason category. */
export interface ReasonCategoryCount {
  category: string;
  count: number;
}

/** Aggregated feedback statistics. */
export interface FeedbackStatsResponse {
  total: number;
  averageRating: number;
  /** Always contains an entry for every rating 1-5, ascending. */
  ratingCounts: RatingCount[];
  /** Reason categories with at least one entry, descending by count. */
  reasonCategoryCounts: ReasonCategoryCount[];
}

/** A single stored feedback entry. */
export interface MessageFeedbackDocument {
  id: string;
  messageId: string;
  threadId: string;
  tenantId: string;
  agentName: string;
  workflowId: string;
  workflowType: string;
  participantId: string;
  starRating: number;
  reasonCategory?: string | null;
  comment?: string | null;
  submittedBy: string;
  submittedAt: string;
  createdAt: string;
}

/** A page of feedback entries. */
export interface FeedbackListResponse {
  items: MessageFeedbackDocument[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * A single feedback entry together with the surrounding thread messages.
 * The thread messages share the wire shape of {@link XiansMessage} (plus an
 * optional embedded feedback summary), so they can be mapped with the existing
 * `mapXiansMessageToMessage` helper.
 */
export interface FeedbackDetailResponse {
  feedback: MessageFeedbackDocument;
  ratedMessageId: string;
  messages: XiansMessage[];
}
