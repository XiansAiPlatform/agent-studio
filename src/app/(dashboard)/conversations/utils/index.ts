import type { Message } from '@/types/conversation';
import type { XiansMessage } from '@/lib/xians/types';

/**
 * Determine the topic parameter for API calls
 * General Discussions (id: 'general-discussions') should use empty string
 * Other topics should use their name (same as id)
 */
export function getTopicParam(topicId: string): string {
  return topicId === 'general-discussions' ? '' : topicId;
}

/**
 * Get the display name for a topic
 */
export function getTopicDisplayName(topicId: string): string {
  return topicId === 'general-discussions' ? 'General Discussions' : topicId;
}

/**
 * Sanitize a URL-derived topic param for safe display in the UI.
 * Used when creating synthetic topics from query params (e.g. ?topic=...) —
 * raw values can be malformed or contain path-like strings, HTML entities, or script-injection attempts.
 * Note: Sanitization is for display correctness (e.g. control chars, length). HTML escaping is handled
 * by React's JSX rendering, so XSS is not the primary concern here.
 */
export function sanitizeTopicDisplayName(raw: string | null | undefined): string {
  if (!raw) return 'New conversation';
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.replace(/\+/g, ' '));
  } catch {
    decoded = raw;
  }
  const sanitized = decoded
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!sanitized) return 'New conversation';
  return sanitized.slice(0, 200);
}

/**
 * Check if a topic ID represents the general discussions topic
 */
export function isGeneralTopic(topicId: string): boolean {
  return topicId === 'general-discussions';
}

/**
 * Extract content from XiansMessage.
 * For Chat: content is in `text`.
 * For Reasoning/Tool: content is in `data` (may be JSON-encoded string like "thinking step 1").
 */
function extractContent(xiansMsg: { text?: string; data?: unknown }): string {
  if (xiansMsg.text && xiansMsg.text.trim()) {
    return xiansMsg.text;
  }
  if (xiansMsg.data == null) return '';
  if (typeof xiansMsg.data === 'string') {
    try {
      const parsed = JSON.parse(xiansMsg.data);
      return typeof parsed === 'string' ? parsed : String(xiansMsg.data);
    } catch {
      return xiansMsg.data.replace(/^"|"$/g, '');
    }
  }
  return typeof xiansMsg.data === 'object' ? JSON.stringify(xiansMsg.data) : String(xiansMsg.data);
}

/**
 * Extract file attachments from a File-type message's data payload.
 * Supports the multi-file shape `{ files: [{ fileName, ... }] }` and the
 * legacy single-file shape `{ fileName, ... }`.
 */
function extractFileAttachments(
  data: unknown,
  messageId: string
): NonNullable<Message['attachments']> | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;

  const rawFiles = Array.isArray(record.files)
    ? (record.files as unknown[])
    : record.fileName != null
      ? [record]
      : [];

  const attachments = rawFiles
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const fileName = record.fileName;
      if (typeof fileName !== 'string' || !fileName) return null;
      const fileId = typeof record.fileId === 'string' && record.fileId ? record.fileId : undefined;
      // Files stored in GridFS expose a download URL via the proxy; inline (legacy) files do not.
      const url = fileId ? `/api/messaging/files/${encodeURIComponent(fileId)}` : undefined;
      return {
        type: 'file' as const,
        id: `${messageId}-file-${index}`,
        name: fileName,
        ...(fileId && { fileId }),
        ...(url && { url }),
      };
    })
    .filter(
      (a): a is { type: 'file'; id: string; name: string; fileId?: string; url?: string } =>
        a !== null
    );

  return attachments.length > 0 ? attachments : undefined;
}

/**
 * Map Xians API message to our Message format.
 * Handles messageType (Reasoning, Tool, File, Chat) and content from text or data.
 */
export function mapXiansMessageToMessage(xiansMsg: XiansMessage): Message {
  const role = xiansMsg.direction === 'Incoming' ? ('user' as const) : ('agent' as const);
  const rawType = (xiansMsg.messageType ?? 'Chat').toLowerCase();
  const messageType =
    rawType === 'reasoning'
      ? ('reasoning' as const)
      : rawType === 'tool'
        ? ('tool' as const)
        : undefined;

  // File messages carry base64 payloads in `data`; never run the generic
  // content fallback (which would stringify the base64 into the bubble).
  const isFile = rawType === 'file';
  const attachments = isFile
    ? extractFileAttachments(xiansMsg.data, xiansMsg.id)
    : undefined;
  const content = isFile ? (xiansMsg.text ?? '') : extractContent(xiansMsg);

  const feedback = xiansMsg.feedback
    ? {
        starRating: xiansMsg.feedback.starRating,
        reasonCategory: xiansMsg.feedback.reasonCategory ?? undefined,
        comment: xiansMsg.feedback.comment ?? undefined,
        submittedBy: xiansMsg.feedback.submittedBy,
        submittedAt:
          typeof xiansMsg.feedback.submittedAt === 'string'
            ? xiansMsg.feedback.submittedAt
            : new Date(xiansMsg.feedback.submittedAt).toISOString(),
      }
    : undefined;

  return {
    id: xiansMsg.id,
    content,
    role,
    timestamp: xiansMsg.createdAt,
    status: 'delivered',
    taskId: xiansMsg.taskId ?? undefined,
    threadId: xiansMsg.threadId,
    workflowId: xiansMsg.workflowId,
    workflowType: xiansMsg.workflowType,
    participantId: xiansMsg.participantId,
    ...(messageType && { messageType }),
    ...(feedback && { feedback }),
    ...(attachments && { attachments }),
  };
}

/**
 * Constants for the conversations page
 */
export const CONVERSATIONS_CONSTANTS = {
  GENERAL_TOPIC_ID: 'general-discussions',
  GENERAL_TOPIC_NAME: 'General Discussions',
  TOPICS_PAGE_SIZE: 20,
  MESSAGES_PAGE_SIZE: 10,
  INITIAL_LOAD_DELAY: 1500,
} as const;
