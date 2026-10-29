// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ConnectionCard } from './connection-card'
import { OIDCConnection } from '../types'

const LONG_NAME = 'webhook-' + 'a'.repeat(100)

function makeConnection(overrides: Partial<OIDCConnection> = {}): OIDCConnection {
  return {
    id: 'conn-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    name: LONG_NAME,
    providerId: 'builtin_webhook',
    clientId: '',
    status: 'connected',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    createdBy: 'user-1',
    hasValidToken: false,
    isActive: true,
    ...overrides,
  }
}

const noop = () => {}

function renderCard(connection: OIDCConnection) {
  return render(
    <ConnectionCard
      connection={connection}
      onEdit={noop}
      onDelete={noop}
      onTest={noop}
      onToggleActive={noop}
      onViewUsage={noop}
    />
  )
}

describe('ConnectionCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('truncates a long name and shows the full name on hover', () => {
    renderCard(makeConnection())

    const heading = screen.getByRole('heading', { name: LONG_NAME })
    expect(heading.getAttribute('title')).toBe(LONG_NAME)
    expect(heading.className).toContain('truncate')
  })

  it('truncates the connection key and shows the full key on hover', () => {
    const connectionKey = 'MCP_OAUTH_' + 'B'.repeat(80)
    renderCard(
      makeConnection({ providerId: 'oauth-mcp', configuration: { connectionKey } })
    )

    const key = screen.getByText(connectionKey)
    expect(key.tagName).toBe('CODE')
    expect(key.getAttribute('title')).toBe(connectionKey)
    expect(key.className).toContain('truncate')
  })
})
