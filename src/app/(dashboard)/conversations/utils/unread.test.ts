import { describe, expect, it } from 'vitest';
import type { Message } from '@/types/conversation';
import { countUnreadAgentMessages } from './unread';

function message(overrides: Partial<Message> & Pick<Message, 'id' | 'role'>): Message {
  return {
    content: overrides.id,
    timestamp: '2026-10-12T12:00:00.000Z',
    ...overrides,
  };
}

const cutoff = '2026-10-12T12:00:00.000Z';

describe('countUnreadAgentMessages', () => {
  it('counts agent chat and file messages that are not Read', () => {
    const messages = [
      message({ id: 'user', role: 'user' }),
      message({ id: 'user-optimistic', role: 'user', readStatus: undefined }),
      message({ id: 'agent', role: 'agent', readStatus: 'Unread' }),
      message({ id: 'agent-null', role: 'agent', readStatus: null }),
      message({ id: 'file', role: 'agent' }),
      message({ id: 'read', role: 'agent', readStatus: 'Read' }),
      message({ id: 'tool', role: 'agent', messageType: 'tool', readStatus: 'Unread' }),
      message({ id: 'reasoning', role: 'agent', messageType: 'reasoning' }),
      message({ id: 'system', role: 'system', readStatus: 'Unread' }),
    ];

    expect(countUnreadAgentMessages(messages, null)).toBe(3);
  });

  it('treats messages at or before the cutoff as read', () => {
    const messages = [
      message({ id: 'before', role: 'agent', timestamp: '2026-10-12T11:00:00.000Z' }),
      message({ id: 'at', role: 'agent', timestamp: cutoff }),
      message({ id: 'after', role: 'agent', timestamp: '2026-10-12T12:00:01.000Z' }),
      message({ id: 'user-after', role: 'user', timestamp: '2026-10-12T12:00:02.000Z' }),
    ];

    expect(countUnreadAgentMessages(messages, cutoff)).toBe(1);
  });
});
