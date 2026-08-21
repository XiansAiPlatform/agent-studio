import type { Message } from '@/types/conversation';

export function isNoConversationalCapabilityError(message: string): boolean {
  const n = message.toLowerCase();
  return (
    n.includes('not registered') ||
    n.includes('registered workflow types') ||
    n.includes('no message handler registered') ||
    n.includes('no chat handler registered')
  );
}

/** True when every agent chat reply is a missing-handler / unregistered error. */
export function messagesIndicateNoConversationalCapability(
  messages: Array<Pick<Message, 'role' | 'content' | 'messageType'>>
): boolean {
  const agentChat = messages.filter(
    (m) => m.role === 'agent' && (!m.messageType || m.messageType === 'chat')
  );
  if (agentChat.length === 0) return false;
  return agentChat.every((m) => isNoConversationalCapabilityError(m.content));
}
