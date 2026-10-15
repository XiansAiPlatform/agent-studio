'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { Contact } from '@/app/(dashboard)/tenant-settings/contacts/types'
import type { EmailConfigStatus } from '@/app/(dashboard)/tenant-settings/email-configs/types'
import { MAX_NOTIFY_CONTACTS } from '../types'

interface NotifyContactsFieldProps {
  selected: string[]
  /** Functional update, so contacts deleted since the eval was saved can be dropped once the list loads. */
  onSelectedChange: (update: (current: string[]) => string[]) => void
  error?: string
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

/**
 * Picks which of the tenant's contacts (Tenant Settings → Contacts) are emailed when the eval
 * starts failing and when it recovers. Warns when the tenant has no email server, since
 * nothing would be sent.
 */
export function NotifyContactsField({ selected, onSelectedChange, error }: NotifyContactsFieldProps) {
  const [contacts, setContacts] = useState<Contact[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [emailOff, setEmailOff] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/settings/contacts')
      .then(async (res) => (res.ok ? ((await res.json()) as Contact[]) : null))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        setContacts(list)
        setLoadFailed(!Array.isArray(data))
        // Contacts deleted since the eval was saved would be rejected on save; drop them.
        if (Array.isArray(data)) {
          const known = new Set(list.map((c) => c.id))
          onSelectedChange((current) => current.filter((id) => known.has(id)))
        }
      })
      .catch(() => {
        if (cancelled) return
        setContacts([])
        setLoadFailed(true)
      })

    // Only a definite "no email server" warns; a failed lookup stays quiet.
    fetch('/api/settings/email-configs')
      .then(async (res) => (res.ok ? ((await res.json()) as EmailConfigStatus) : null))
      .then((status) => {
        if (!cancelled && status?.source === 'None') setEmailOff(true)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [onSelectedChange])

  const toggle = (id: string, checked: boolean) =>
    onSelectedChange((current) => (checked ? [...current, id] : current.filter((x) => x !== id)))

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label>Notify on failure</Label>
        {selected.length > 0 && <span className="text-xs text-muted-foreground">{selected.length} selected</span>}
      </div>
      <Hint>Selected contacts get an email when this eval starts failing, and another when it passes again.</Hint>

      {contacts === null ? (
        <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading contacts…
        </div>
      ) : contacts.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {loadFailed ? (
            'Could not load the tenant’s contacts.'
          ) : (
            <>
              No contacts yet. Add them in{' '}
              <Link href="/tenant-settings/contacts" className="text-primary hover:underline">
                Tenant Settings → Contacts
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <div className="max-h-48 divide-y overflow-y-auto rounded-md border">
          {contacts.map((contact) => {
            const checked = selected.includes(contact.id)
            const atLimit = !checked && selected.length >= MAX_NOTIFY_CONTACTS
            return (
              <label
                key={contact.id}
                className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent/30 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
              >
                <Checkbox
                  checked={checked}
                  disabled={atLimit}
                  onCheckedChange={(value) => toggle(contact.id, value === true)}
                  aria-label={`Notify ${contact.name}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{contact.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{contact.email}</span>
                </span>
              </label>
            )
          })}
        </div>
      )}

      {emailOff && selected.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Email isn’t set up for this tenant, so no notifications will be sent. Set it up in{' '}
            <Link href="/tenant-settings/email-configs" className="underline">
              Tenant Settings → Email
            </Link>
            .
          </span>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
