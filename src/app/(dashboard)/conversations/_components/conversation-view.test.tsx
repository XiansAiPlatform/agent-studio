// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { Conversation, Message } from '@/types/conversation'
import { ChatInterface } from '@/components/features/conversations/chat-interface'
import { ConversationView } from './conversation-view'
import { ParticipantLayoutProvider } from '@/contexts/participant-layout-context'
import type { ActivationOption } from '@/components/features/conversations'

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt ?? ''} />,
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { email: 'admin@example.com' } },
    status: 'authenticated',
  }),
}))

vi.mock('@/hooks/use-tenant', () => ({
  useTenant: () => ({
    currentTenant: { tenant: { name: 'Acme', metadata: {} } },
    currentTenantId: 'tenant-1',
    tenants: [],
    isLoading: false,
  }),
}))

const agentMessage: Message = {
  id: 'msg-1',
  content: 'Here is an agent reply.',
  role: 'agent',
  timestamp: '2026-01-01T12:00:00.000Z',
  threadId: 'thread-1',
  workflowId: 'wf-1',
  workflowType: 'chat',
  participantId: 'user@example.com',
}

const conversation: Conversation = {
  id: 'conv-1',
  tenantId: 'tenant-1',
  user: { id: 'u1', name: 'User' },
  agent: { id: 'a1', name: 'Support', status: 'online' },
  startTime: '2026-01-01T11:00:00.000Z',
  lastActivity: '2026-01-01T12:00:00.000Z',
  status: 'active',
  topics: [
    {
      id: 'topic-1',
      name: 'General',
      createdAt: '2026-01-01T11:00:00.000Z',
      status: 'active',
      messages: [agentMessage],
    },
  ],
}

const activations: ActivationOption[] = [
  {
    id: 'act-1',
    name: 'prod',
    agentName: 'Support',
    status: 'active',
  },
]

function renderConversationView(readOnly: boolean) {
  return render(
    <ParticipantLayoutProvider isParticipantMode={false}>
      <ConversationView
        conversation={conversation}
        selectedTopicId="topic-1"
        onTopicSelect={() => {}}
        onSendMessage={() => {}}
        isLoadingMessages={false}
        onLoadMoreMessages={() => {}}
        isLoadingMoreMessages={false}
        hasMoreMessages={false}
        unreadCounts={{}}
        activations={activations}
        selectedActivationName="prod"
        onActivationChange={() => {}}
        isLoadingActivations={false}
        agentName="Support"
        currentPage={1}
        totalPages={1}
        hasMore={false}
        onPageChange={() => {}}
        isConnected
        onCreateTopic={() => {}}
        onDeleteTopic={async () => {}}
        allowFileUpload
        readOnly={readOnly}
      />
    </ParticipantLayoutProvider>
  )
}

describe('view-as read-only UI', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tasks: [], totalCount: 0, definitions: [] }),
      })
    )
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('hides the composer and feedback trigger in ChatInterface when readOnly', () => {
    const { rerender } = render(
      <ChatInterface
        conversation={conversation}
        selectedTopicId="topic-1"
        activationName="Support"
        onSendMessage={() => {}}
        isActivationActive
        hideHeader
        onMessageFeedbackSubmitted={() => {}}
        readOnly={false}
      />
    )

    expect(screen.getByPlaceholderText(/Message Support/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Rate response' })).toBeTruthy()
    expect(
      screen.queryByText(/Read-only: you are viewing another user's conversation/)
    ).toBeNull()

    rerender(
      <ChatInterface
        conversation={conversation}
        selectedTopicId="topic-1"
        activationName="Support"
        onSendMessage={() => {}}
        isActivationActive
        hideHeader
        onMessageFeedbackSubmitted={() => {}}
        readOnly
      />
    )

    expect(screen.queryByPlaceholderText(/Message Support/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rate response' })).toBeNull()
    expect(
      screen.getByText(/Read-only: you are viewing another user's conversation/)
    ).toBeTruthy()
  })

  it('hides composer, feedback, and topic create/delete in ConversationView when readOnly', () => {
    const { rerender } = renderConversationView(false)

    expect(screen.getByPlaceholderText(/Message prod/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Rate response' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create topic' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Topic actions' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Attach files' })).toBeTruthy()

    rerender(
      <ParticipantLayoutProvider isParticipantMode={false}>
        <ConversationView
          conversation={conversation}
          selectedTopicId="topic-1"
          onTopicSelect={() => {}}
          onSendMessage={() => {}}
          isLoadingMessages={false}
          onLoadMoreMessages={() => {}}
          isLoadingMoreMessages={false}
          hasMoreMessages={false}
          unreadCounts={{}}
          activations={activations}
          selectedActivationName="prod"
          onActivationChange={() => {}}
          isLoadingActivations={false}
          agentName="Support"
          currentPage={1}
          totalPages={1}
          hasMore={false}
          onPageChange={() => {}}
          isConnected
          onCreateTopic={() => {}}
          onDeleteTopic={async () => {}}
          allowFileUpload
          readOnly
        />
      </ParticipantLayoutProvider>
    )

    expect(screen.queryByPlaceholderText(/Message prod/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rate response' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Create topic' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Topic actions' })).toBeNull()
    expect(screen.queryByRole('button', { name: /attach file/i })).toBeNull()
    expect(
      screen.getByText(/Read-only: you are viewing another user's conversation/)
    ).toBeTruthy()
  })
})
