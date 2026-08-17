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
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        data = JSON.parse(trimmed);
      } catch {
        return undefined;
      }
    }
  }
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
 * File is direction-agnostic: Incoming → user chip, Outgoing → agent chip. Both use
 * attachments (not messageType: 'file') so the normal chat bubble renderer applies.
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

  // File messages carry fileId refs in `data`; never run the generic content
  // fallback (which would stringify refs into the bubble).
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
 * Merge freshly fetched history into the messages already on screen, keeping
 * chronological order. Used to backfill replies that arrived while the SSE
 * stream was down.
 *
 * Server rows win over anything already held under the same id, and an
 * optimistic `temp-` row is dropped once the server echoes back the same
 * user message.
 */
export function mergeMessagesById(existing: Message[], incoming: Message[]): Message[] {
  if (incoming.length === 0) return existing;

  const incomingIds = new Set(incoming.map((m) => m.id));
  const existingIds = new Set(existing.map((m) => m.id));

  // Only a server row we haven't seen before can stand in for an optimistic row,
  // and it can stand in for exactly one - sending the same text twice must not
  // collapse into a single bubble.
  const unmatchedUserContent = new Map<string, number>();
  for (const m of incoming) {
    if (m.role !== 'user' || existingIds.has(m.id)) continue;
    const key = m.content.trim();
    unmatchedUserContent.set(key, (unmatchedUserContent.get(key) ?? 0) + 1);
  }

  const kept = existing.filter((m) => {
    if (incomingIds.has(m.id)) return false;
    if (!m.id.startsWith('temp-')) return true;

    const key = m.content.trim();
    const remaining = unmatchedUserContent.get(key) ?? 0;
    if (remaining === 0) return true;

    unmatchedUserContent.set(key, remaining - 1);
    return false;
  });

  return [...kept, ...incoming].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Toast body for a background-topic SSE message.
 * File messages with no caption fall back to the attachment name(s) instead of an empty string.
 */
export function getBackgroundTopicToastDescription(message: Message): string {
  const caption = message.content.trim();
  if (caption) {
    return caption.length > 100 ? `${caption.substring(0, 100)}...` : caption;
  }

  const files = message.attachments?.filter((a) => a.type === 'file') ?? [];
  if (files.length === 1) {
    return `Sent a file: ${files[0].name}`;
  }
  if (files.length > 1) {
    return `${files.length} files`;
  }

  return '';
}
