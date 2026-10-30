// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { OIDCConnection } from './types'

const { useConnections, setIntegrationEnabled, updateConnection, showErrorToast } = vi.hoisted(() => ({
  useConnections: vi.fn(),
  setIntegrationEnabled: vi.fn(),
  updateConnection: vi.fn(),
  showErrorToast: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('agentName=Agent&activationName=Activation'),
}))
vi.mock('@/lib/utils/error-handler', () => ({ showErrorToast, showSuccessToast: vi.fn() }))
vi.mock('./hooks/use-connections', () => ({ useConnections }))

// Only the toggle wiring is under test, so the card is reduced to its Disable action
vi.mock('./components/connection-card', () => ({
  ConnectionCard: ({ connection, onToggleActive }: {
    connection: OIDCConnection
    onToggleActive: (id: string, active: boolean) => void
  }) => (
    <button onClick={() => onToggleActive(connection.id, !connection.isActive)}>
      Toggle {connection.name}
    </button>
  ),
}))
vi.mock('./components/create-connection-dialog', () => ({ CreateConnectionDialog: () => null }))
vi.mock('./components/delete-connection-dialog', () => ({ DeleteConnectionDialog: () => null }))
vi.mock('./components/integration-details-sheet', () => ({ IntegrationDetailsSheet: () => null }))
vi.mock('./components/slack-wizard-sheet', () => ({ SlackWizardSheet: () => null }))
vi.mock('./components/teams-wizard-sheet', () => ({ TeamsWizardSheet: () => null }))
vi.mock('./components/webhooks-sheet', () => ({ WebhooksSheet: () => null }))
vi.mock('./components/oauth-mcp-wizard-sheet', () => ({ OAuthMcpWizardSheet: () => null }))

import ConnectionsPage from './page'

const mutation = (mutateAsync = vi.fn()) => ({ isPending: false, error: null, mutateAsync, mutate: vi.fn() })

function connection(overrides: Partial<OIDCConnection>): OIDCConnection {
  return {
    id: 'conn-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    name: 'Connection',
    providerId: 'provider',
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

describe('ConnectionsPage Enable/Disable', () => {
  beforeEach(() => {
    setIntegrationEnabled.mockReset().mockResolvedValue(undefined)
    updateConnection.mockReset().mockResolvedValue(undefined)
    showErrorToast.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  function renderWith(connectionUnderTest: OIDCConnection) {
    useConnections.mockReturnValue({
      connections: [connectionUnderTest],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createConnection: mutation(),
      initiateConnection: mutation(),
      updateConnection: mutation(updateConnection),
      deleteConnection: mutation(),
      deleteIntegration: mutation(),
      setIntegrationEnabled: mutation(setIntegrationEnabled),
      testConnection: mutation(),
      authorizeConnection: mutation(),
      createIntegration: mutation(),
    })
    render(<ConnectionsPage />)
    fireEvent.click(screen.getByRole('button', { name: `Toggle ${connectionUnderTest.name}` }))
  }

  it('sends connections with a platformId to the integration routes', async () => {
    renderWith(connection({ id: 'int-1', name: 'Webhook', platformId: 'builtin_webhook' }))

    await waitFor(() =>
      expect(setIntegrationEnabled).toHaveBeenCalledWith({ id: 'int-1', enabled: false })
    )
    expect(updateConnection).not.toHaveBeenCalled()
  })

  it('sends connections without a platformId to the connections API', async () => {
    renderWith(connection({ id: 'conn-1', name: 'OIDC' }))

    await waitFor(() =>
      expect(updateConnection).toHaveBeenCalledWith({ id: 'conn-1', data: { isActive: false } })
    )
    expect(setIntegrationEnabled).not.toHaveBeenCalled()
  })

  it('shows an error toast when the toggle fails', async () => {
    const error = new Error('Toggle failed')
    setIntegrationEnabled.mockRejectedValue(error)

    renderWith(connection({ name: 'Webhook', platformId: 'builtin_webhook' }))

    await waitFor(() => expect(showErrorToast).toHaveBeenCalledWith(error))
  })
})
