'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { UserIdentityFields } from '@/lib/users/identity'

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function displayText(value?: string | null): string {
  if (value == null || value === '') return '—'
  return value
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const canCopy = Boolean(mono && value !== '—')

  const handleCopy = async () => {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Ignore clipboard failures; the value is still visible.
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0 pt-0.5">{label}</span>
      <div className="min-w-0 flex items-start gap-1.5 justify-end">
        <span
          className={`text-right font-medium text-foreground break-all ${
            mono ? 'font-mono text-xs' : ''
          }`}
        >
          {value}
        </span>
        {canCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            title={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}
            aria-label={copied ? 'Copied' : `Copy ${label}`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}

export function UserIdentityDetails({ user }: { user: UserIdentityFields }) {
  return (
    <div className="space-y-3 rounded-lg border px-4 py-3">
      <p className="text-sm font-medium">Account details</p>
      <div className="space-y-2.5">
        <MetaRow label="User ID" value={displayText(user.userId)} mono />
        <MetaRow
          label="Provider authority"
          value={displayText(user.providerAuthority)}
          mono
        />
        <MetaRow label="Locked out" value={user.isLockedOut ? 'Yes' : 'No'} />
        <MetaRow label="Lockout reason" value={displayText(user.lockedOutReason)} />
        <MetaRow label="Locked out at" value={formatDateTime(user.lockedOutAt)} />
        <MetaRow label="Locked out by" value={displayText(user.lockedOutBy)} />
        <MetaRow label="Created" value={formatDateTime(user.createdAt)} />
        <MetaRow label="Updated" value={formatDateTime(user.updatedAt)} />
      </div>
    </div>
  )
}
