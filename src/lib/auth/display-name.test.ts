import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()

vi.mock('@/lib/xians/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/xians/client')>(
    '@/lib/xians/client'
  )
  return {
    ...actual,
    createXiansClient: () => ({ get }),
  }
})

import { XiansApiError } from '@/lib/xians/client'

import {
  ADMIN_USER_SEARCH_MAX_PAGES,
  applyStoredDisplayName,
  chooseDisplayName,
  classifyStoredName,
  classifyStoredNameFromSearch,
  rememberProviderName,
  sessionNameFromToken,
  shouldFetchNextAdminUserSearchPage,
  shouldRefreshStoredDisplayName,
  shouldRevalidateTenantMembership,
  type DisplayNameToken,
} from './display-name'

function completeSearchPage(users: unknown[]) {
  return {
    users,
    totalCount: users.length,
    pageSize: 100,
    pagination: { hasNext: false },
  }
}

describe('chooseDisplayName', () => {
  it('uses the stored name when one is set', () => {
    expect(
      chooseDisplayName({
        storedName: 'Stored Display Name',
        providerName: 'admin',
        email: 'admin@localhost.local',
      })
    ).toBe('Stored Display Name')
  })

  it('falls back to the provider name when the stored name is blank', () => {
    expect(
      chooseDisplayName({
        storedName: '  ',
        providerName: 'IdP Display Name',
        email: 'user@example.com',
      })
    ).toBe('IdP Display Name')
  })

  it('falls back to the email when no name is available', () => {
    expect(
      chooseDisplayName({
        storedName: null,
        providerName: '',
        email: 'admin@localhost.local',
      })
    ).toBe('admin@localhost.local')
  })
})

describe('classifyStoredName', () => {
  const users = [
    { email: 'Admin@Localhost.Local', name: 'Stored Display Name' },
    { email: 'jane@localhost.local', name: 'Jane' },
    { email: 'admin@localhost.local.extra', name: 'Not Admin' },
  ]

  it('matches the email exactly, ignoring case', () => {
    expect(classifyStoredName(users, 'admin@localhost.local')).toEqual({
      status: 'found',
      name: 'Stored Display Name',
    })
  })

  it('does not treat a partial search hit as the same account', () => {
    expect(classifyStoredName(users, 'admin@localhost.local.extra')).toEqual({
      status: 'found',
      name: 'Not Admin',
    })
    expect(classifyStoredName([{ email: 'admin@localhost.local.extra', name: 'Not Admin' }], 'admin@localhost.local')).toEqual({
      status: 'fallback',
    })
  })

  it('leaves the name unchanged when two accounts share an email', () => {
    expect(
      classifyStoredName(
        [
          { email: 'duplicate@example.com', name: 'Stored Alias' },
          { email: 'duplicate@example.com', name: 'Other Stored' },
        ],
        'duplicate@example.com'
      )
    ).toEqual({ status: 'unchanged' })
  })

  it('falls back when the stored name is empty', () => {
    expect(
      classifyStoredName([{ email: 'admin@localhost.local', name: '  ' }], 'admin@localhost.local')
    ).toEqual({ status: 'fallback' })
  })
})

describe('classifyStoredNameFromSearch', () => {
  it('refuses a unique match when the search page is incomplete', () => {
    const users = [
      { email: 'user@example.com', name: 'Stored Display Name' },
      ...Array.from({ length: 19 }, (_, i) => ({
        email: `other-${i}@example.com`,
        name: 'Other',
      })),
    ]
    expect(classifyStoredNameFromSearch(users, 'user@example.com', false)).toEqual({
      status: 'unchanged',
    })
    expect(classifyStoredNameFromSearch(users, 'user@example.com', true)).toEqual({
      status: 'found',
      name: 'Stored Display Name',
    })
  })
})

describe('shouldFetchNextAdminUserSearchPage', () => {
  it('stops at the page cap and elapsed-time cap', () => {
    expect(
      shouldFetchNextAdminUserSearchPage({
        pagesFetched: ADMIN_USER_SEARCH_MAX_PAGES,
        maxPages: ADMIN_USER_SEARCH_MAX_PAGES,
        elapsedMs: 0,
        maxElapsedMs: 3_000,
      })
    ).toBe(false)
    expect(
      shouldFetchNextAdminUserSearchPage({
        pagesFetched: 1,
        maxPages: ADMIN_USER_SEARCH_MAX_PAGES,
        elapsedMs: 3_000,
        maxElapsedMs: 3_000,
      })
    ).toBe(false)
    expect(
      shouldFetchNextAdminUserSearchPage({
        pagesFetched: 1,
        maxPages: ADMIN_USER_SEARCH_MAX_PAGES,
        elapsedMs: 100,
        maxElapsedMs: 3_000,
      })
    ).toBe(true)
  })
})

describe('jwt refresh helpers', () => {
  it('revalidates tenant access on update and stale refresh', () => {
    expect(
      shouldRevalidateTenantMembership({
        trigger: 'update',
        isStale: false,
        email: 'a@example.com',
      })
    ).toBe(true)
    expect(
      shouldRevalidateTenantMembership({
        trigger: undefined,
        isStale: true,
        email: 'a@example.com',
      })
    ).toBe(true)
  })

  it('refreshes display name on sign-in and stale refresh, not on update alone', () => {
    expect(
      shouldRefreshStoredDisplayName({
        hasSignInUser: true,
        isStale: false,
        email: 'a@example.com',
      })
    ).toBe(true)
    expect(
      shouldRefreshStoredDisplayName({
        hasSignInUser: false,
        isStale: true,
        email: 'a@example.com',
      })
    ).toBe(true)
    expect(
      shouldRefreshStoredDisplayName({
        hasSignInUser: false,
        isStale: false,
        email: 'a@example.com',
      })
    ).toBe(false)
  })
})

describe('sessionNameFromToken', () => {
  it('prefers a non-empty token name', () => {
    expect(sessionNameFromToken('Stored Display Name', 'IdP Name')).toBe(
      'Stored Display Name'
    )
  })

  it('keeps the session name when the token name is blank', () => {
    expect(sessionNameFromToken('  ', 'Session Name')).toBe('Session Name')
  })
})

describe('applyStoredDisplayName', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('replaces the provider name with the stored name and remembers the provider name', async () => {
    get.mockResolvedValue(
      completeSearchPage([{ email: 'admin@localhost.local', name: 'Stored Display Name' }])
    )
    const token: DisplayNameToken = {
      name: 'admin',
      email: 'admin@localhost.local',
    }

    await applyStoredDisplayName(token)

    expect(token.name).toBe('Stored Display Name')
    expect(token.providerName).toBe('admin')
    expect(String(get.mock.calls[0]?.[0])).toContain(
      'search=admin%40localhost.local'
    )
  })

  it('does not trust a lone match when pagination hits the page cap', async () => {
    const filler = Array.from({ length: 100 }, (_, i) => ({
      email: `filler-${i}@example.com`,
      name: 'Other',
    }))
    get.mockImplementation((path: string) => {
      const pageMatch = path.match(/[?&]page=(\d+)/)
      const page = pageMatch ? Number(pageMatch[1]) : 1
      return Promise.resolve({
        users:
          page === 1
            ? [{ email: 'user@example.com', name: 'Stored Display Name' }, ...filler]
            : filler,
        totalCount: 10_000,
        pageSize: 100,
        pagination: { hasNext: true },
      })
    })
    const token: DisplayNameToken = {
      name: 'IdP Display Name',
      email: 'user@example.com',
    }

    await applyStoredDisplayName(token)

    expect(token.name).toBe('IdP Display Name')
    expect(get.mock.calls.length).toBeLessThanOrEqual(ADMIN_USER_SEARCH_MAX_PAGES)
  })

  it('does not trust a lone match when search results are truncated', async () => {
    get
      .mockResolvedValueOnce({
        users: [{ email: 'user@example.com', name: 'Stored Display Name' }],
        totalCount: 50,
        pageSize: 100,
        pagination: { hasNext: true },
      })
      .mockResolvedValueOnce({
        users: [],
        totalCount: 50,
        pagination: { hasNext: false },
      })
    const token: DisplayNameToken = {
      name: 'IdP Display Name',
      email: 'user@example.com',
    }

    await applyStoredDisplayName(token)

    expect(token.name).toBe('IdP Display Name')
  })

  it('restores the provider name when the stored name is later cleared', async () => {
    const token: DisplayNameToken = {
      name: 'Stored Display Name',
      email: 'admin@localhost.local',
      providerName: 'admin',
    }
    get.mockResolvedValue(
      completeSearchPage([{ email: 'admin@localhost.local', name: '' }])
    )

    await applyStoredDisplayName(token)

    expect(token.name).toBe('admin')
    expect(token.providerName).toBe('admin')
  })

  it('does not adopt a stored name when the email matches more than one account', async () => {
    get.mockResolvedValue(
      completeSearchPage([
        { email: 'duplicate@example.com', name: 'Stored Alias' },
        { email: 'duplicate@example.com', name: 'Other Stored' },
      ])
    )
    const token: DisplayNameToken = {
      name: 'IdP Display Name',
      email: 'duplicate@example.com',
    }

    await applyStoredDisplayName(token)

    expect(token.name).toBe('IdP Display Name')
  })

  it('uses the account whose id is the email when search does not return it', async () => {
    get
      .mockResolvedValueOnce(completeSearchPage([]))
      .mockResolvedValueOnce({ email: 'admin@localhost.local', name: 'Stored Display Name' })
    const token: DisplayNameToken = { name: 'admin', email: 'admin@localhost.local' }

    await applyStoredDisplayName(token)

    expect(token.name).toBe('Stored Display Name')
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('keeps the provider name when the account has no stored record', async () => {
    get
      .mockResolvedValueOnce(completeSearchPage([]))
      .mockRejectedValueOnce(new XiansApiError('missing', 404))
    const token: DisplayNameToken = { name: 'admin', email: 'admin@localhost.local' }

    await applyStoredDisplayName(token)

    expect(token.name).toBe('admin')
  })

  it('keeps the current name when the directory lookup fails', async () => {
    get.mockRejectedValue(new Error('offline'))
    const token: DisplayNameToken = { name: 'admin', email: 'admin@localhost.local' }

    await expect(applyStoredDisplayName(token)).rejects.toThrow('offline')
    expect(token.name).toBe('admin')
  })
})

describe('rememberProviderName', () => {
  it('captures the provider name on first call from token.name', () => {
    const token: DisplayNameToken = { name: 'John Doe', providerName: undefined }
    rememberProviderName(token)
    expect(token.providerName).toBe('John Doe')
  })

  it('captures null when token.name is blank', () => {
    const token: DisplayNameToken = { name: ' ', providerName: undefined }
    rememberProviderName(token)
    expect(token.providerName).toBe(null)
  })

  it('does not replace a captured provider name with the stored name', () => {
    const token: DisplayNameToken = {
      name: 'Stored Display Name',
      providerName: 'admin',
    }
    rememberProviderName(token)
    expect(token.providerName).toBe('admin')
  })
})
