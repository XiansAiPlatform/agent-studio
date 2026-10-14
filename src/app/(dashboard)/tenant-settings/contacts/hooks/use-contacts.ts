import { useState, useCallback, useEffect, useRef } from 'react'
import { throwApiRequestError } from '@/lib/api/request-error'
import { Contact, ContactRequest } from '../types'

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Abort any in-flight list request on unmount.
  useEffect(() => () => abortRef.current?.abort(), [])

  // Each call aborts the previous one, so a slow stale response can never overwrite newer results.
  const fetchContacts = useCallback(async (search = '') => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await fetch(`/api/settings/contacts${query}`, { signal: controller.signal })
      if (!res.ok) await throwApiRequestError(res, 'Failed to load contacts')
      setContacts(await res.json())
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (abortRef.current === controller) setIsLoading(false)
    }
  }, [])

  const createContact = useCallback(async (data: ContactRequest): Promise<Contact> => {
    const res = await fetch('/api/settings/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiRequestError(res, 'Failed to create contact')
    return res.json()
  }, [])

  const updateContact = useCallback(
    async (id: string, data: ContactRequest): Promise<Contact> => {
      const res = await fetch(`/api/settings/contacts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) await throwApiRequestError(res, 'Failed to update contact')
      return res.json()
    },
    []
  )

  const deleteContact = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/settings/contacts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!res.ok) await throwApiRequestError(res, 'Failed to delete contact')
  }, [])

  return {
    contacts,
    isLoading,
    error,
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  }
}
