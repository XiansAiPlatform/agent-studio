import { useCallback, useState } from 'react'
import { EmailConfigForm, EmailConfigStatus } from '../types'
import { toRequest } from '../utils'

interface EmailConfigState {
  status: EmailConfigStatus | null
  isLoading: boolean
  error: string | null
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}))
  return body.error ?? `${fallback} (${res.status})`
}

export function useEmailConfig() {
  const [state, setState] = useState<EmailConfigState>({
    status: null,
    isLoading: false,
    error: null,
  })
  const [isMutating, setIsMutating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const fetchConfig = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const res = await fetch('/api/settings/email-configs')
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load email configuration'))
      }
      const status: EmailConfigStatus = await res.json()
      setState({ status, isLoading: false, error: null })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [])

  const saveConfig = useCallback(async (form: EmailConfigForm): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch('/api/settings/email-configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toRequest(form)),
      })
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to save email configuration'))
      }
      const status: EmailConfigStatus = await res.json()
      setState((prev) => ({ ...prev, status, error: null }))
    } finally {
      setIsMutating(false)
    }
  }, [])

  const deleteConfig = useCallback(async (): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch('/api/settings/email-configs', { method: 'DELETE' })
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to reset to the server default'))
      }
      const status: EmailConfigStatus = await res.json()
      setState((prev) => ({ ...prev, status, error: null }))
    } finally {
      setIsMutating(false)
    }
  }, [])

  /** Sends a test email to the signed-in user. Returns the address it was sent to. */
  const sendTestEmail = useCallback(async (form: EmailConfigForm): Promise<string> => {
    setIsTesting(true)
    try {
      const res = await fetch('/api/settings/email-configs/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toRequest(form)),
      })
      if (!res.ok) {
        throw new Error(await parseError(res, 'Could not send test email'))
      }
      const body: { to: string } = await res.json()
      return body.to
    } finally {
      setIsTesting(false)
    }
  }, [])

  return {
    ...state,
    isMutating,
    isTesting,
    fetchConfig,
    saveConfig,
    deleteConfig,
    sendTestEmail,
  }
}
