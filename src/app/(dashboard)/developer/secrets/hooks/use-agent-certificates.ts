import { useCallback, useState } from 'react'
import { AgentCertificate } from '../types'

interface CertificatesState {
  certificates: AgentCertificate[]
  isLoading: boolean
  error: string | null
}

export function useAgentCertificates() {
  const [state, setState] = useState<CertificatesState>({
    certificates: [],
    isLoading: false,
    error: null,
  })
  const [isMutating, setIsMutating] = useState(false)

  const fetchCertificates = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const res = await fetch('/api/developer/agent-certificates', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      const data: AgentCertificate[] = await res.json()
      setState({ certificates: data ?? [], isLoading: false, error: null })
    } catch (err) {
      setState({
        certificates: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }, [])

  const generateCertificate = useCallback(
    async (name: string, revokePrevious: boolean): Promise<string> => {
      setIsMutating(true)
      try {
        const res = await fetch('/api/developer/agent-certificates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, revokePrevious }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to generate certificate (${res.status})`)
        }
        // The backend may return a plain base64 string (JSON-quoted) or an object.
        // Parse defensively so the consumer always receives a string.
        const text = await res.text()
        try {
          const parsed = JSON.parse(text)
          if (typeof parsed === 'string') return parsed
          // Some backends wrap the value in an object field
          if (parsed && typeof parsed === 'object') {
            const val = parsed.value ?? parsed.certificate ?? parsed.data ?? parsed.result
            if (typeof val === 'string') return val
          }
          // Fall back to the raw text
          return text
        } catch {
          return text
        }
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const revokeCertificate = useCallback(
    async (thumbprint: string, reason?: string): Promise<void> => {
      setIsMutating(true)
      try {
        const res = await fetch(
          `/api/developer/agent-certificates/${encodeURIComponent(thumbprint)}/revoke`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
          }
        )
        if (!res.ok && res.status !== 200) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to revoke certificate (${res.status})`)
        }
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  return {
    ...state,
    isMutating,
    fetchCertificates,
    generateCertificate,
    revokeCertificate,
  }
}
