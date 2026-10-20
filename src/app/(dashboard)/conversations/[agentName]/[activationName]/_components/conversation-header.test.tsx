// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import type { Message, Topic } from '@/types/conversation'
import { ConversationHeader } from './conversation-header'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/app/(dashboard)/dashboard/hooks/use-my-pending-task-count', () => ({
  useMyPendingTaskCount: () => ({ count: 0 }),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

function message(overrides: Partial<Message> & Pick<Message, 'id' | 'role'>): Message {
  return {
    content: overrides.id,
    timestamp: '2026-10-12T12:00:00.000Z',
    readStatus: 'Unread',
    threadId: 'thread-1',
    ...overrides,
  }
}

const topic: Topic = {
  id: 'general-discussions',
  name: 'General Discussions',
  createdAt: '2026-10-12T11:00:00.000Z',
  status: 'active',
  messageCount: 4,
  messages: [
    message({ id: 'user-1', role: 'user', content: 'hey' }),
    message({ id: 'agent-1', role: 'agent', content: 'Drafting a customer email.' }),
    message({ id: 'tool-1', role: 'agent', messageType: 'tool', content: 'lookup' }),
    message({ id: 'user-2', role: 'user', content: 'write an email', readStatus: undefined }),
  ],
}

function renderHeader(readOnly = false) {
  return render(
    <ConversationHeader
      activationName="EmailDraftAgent - Raw Damselfly"
      topic={topic}
      tenantId="tenant-1"
      threadId="thread-1"
      workflowName="Supervisor Workflow"
      isConnected
      isAgentActive
      workerAvailable
      agentName="EmailDraftAgent"
      readOnly={readOnly}
    />
  )
}

function readCalls() {
  return vi.mocked(fetch).mock.calls.filter(([input]) => String(input).includes('/read'))
}

describe('ConversationHeader unread count', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markedCount: 9, unreadCount: 9 }),
      })
    )
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('counts agent chat messages and ignores the user messages', () => {
    renderHeader()

    expect(screen.getByText('1 unread')).toBeTruthy()
    expect(screen.queryByText('4 unread')).toBeNull()
    expect(screen.queryByText('2 unread')).toBeNull()
  })

  it('marks the open thread read and clears the badge without using the server count', async () => {
    renderHeader()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(readCalls()).toHaveLength(1)
    expect(String(readCalls()[0][0])).toBe('/api/messaging/threads/thread-1/read')
    expect(screen.queryByText(/unread/)).toBeNull()
  })

  it('does not persist read state while viewing as another user', async () => {
    renderHeader(true)

    expect(screen.getByText('1 unread')).toBeTruthy()
    expect(screen.getByRole('button', { name: /mark read/i })).toHaveProperty('disabled', true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    expect(readCalls()).toHaveLength(0)
    expect(screen.getByText('1 unread')).toBeTruthy()
  })

  it('reports the local agent unread count after Mark read', async () => {
    renderHeader()

    fireEvent.click(screen.getByRole('button', { name: /mark read/i }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(toast.success).toHaveBeenCalledWith(
      'Marked 1 message as read',
      expect.objectContaining({ description: '0 unread remaining in thread' })
    )
  })
})
