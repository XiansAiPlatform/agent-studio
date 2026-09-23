'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from 'next-auth/react'
import { z } from 'zod'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { useCan } from '@/hooks/use-permissions'
import { CreateSecretRequest, CreateSecretScope } from '../types'

const KEY_PATTERN = /^[A-Za-z0-9._-]+$/

// Server-side AdditionalData enforces a per-value max of 2048 chars.
const DESCRIPTION_MAX = 500

const schema = z
  .object({
    key: z
      .string()
      .min(1, 'Key is required')
      .max(128, 'Key is too long')
      .regex(
        KEY_PATTERN,
        'Key may only contain letters, numbers, dots, dashes, and underscores'
      ),
    value: z.string().min(1, 'Value is required'),
    description: z
      .string()
      .max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or less`)
      .optional(),
    scope: z.enum(['tenant', 'user']),
    userId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'user' && !data.userId?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['userId'],
        message: 'Participant is required for user-scoped secrets',
      })
    }
  })

type FormValues = z.infer<typeof schema>

type DirectoryUser = {
  userId: string
  name?: string
  email?: string
}

function participantIdFromUser(user: DirectoryUser): string {
  return (user.email || user.userId).trim().toLowerCase()
}

function userLabel(user: DirectoryUser): string {
  const participantId = participantIdFromUser(user)
  if (user.name && user.name.trim() && user.name.trim().toLowerCase() !== participantId) {
    return `${user.name.trim()} (${participantId})`
  }
  return participantId
}

interface AddSecretDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateSecretRequest) => Promise<void>
}

export function AddSecretDialog({ open, onOpenChange, onSubmit }: AddSecretDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showValue, setShowValue] = useState(false)
  const [directory, setDirectory] = useState<DirectoryUser[]>([])
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false)
  // Without this capability the caller may only create user-scoped secrets for
  // themselves (enforced server-side too), so the member directory isn't loaded.
  const canManageOtherUsers = useCan('secrets:manage-user-scoped')
  const { data: session } = useSession()
  const selfUserId = session?.user?.email?.trim().toLowerCase() ?? ''

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { key: '', value: '', description: '', scope: 'tenant', userId: '' },
  })

  const descriptionValue = watch('description') ?? ''
  const scope = watch('scope')
  const uniqueDirectory = useMemo(() => {
    const seen = new Set<string>()
    return directory.filter((user) => {
      const participantId = participantIdFromUser(user)
      if (!participantId || seen.has(participantId)) return false
      seen.add(participantId)
      return true
    })
  }, [directory])
  const useDirectoryPicker = uniqueDirectory.length > 0

  useEffect(() => {
    if (!open || scope !== 'user' || canManageOtherUsers) return
    setValue('userId', selfUserId)
  }, [open, scope, canManageOtherUsers, selfUserId, setValue])

  useEffect(() => {
    if (!open || !canManageOtherUsers) return
    let cancelled = false
    setIsLoadingDirectory(true)

    ;(async () => {
      try {
        const res = await fetch('/api/settings/secrets/participants')
        if (cancelled) return
        const data = (await res.json()) as {
          participants?: Array<{
            userId?: string
            user_id?: string
            name?: string
            email?: string
          }>
        }
        if (res.ok && Array.isArray(data.participants)) {
          setDirectory(
            data.participants
              .map((u) => ({
                userId: u.userId ?? u.user_id ?? '',
                name: u.name,
                email: u.email,
              }))
              .filter((u) => u.userId || u.email)
          )
        } else {
          setDirectory([])
        }
      } catch {
        if (!cancelled) setDirectory([])
      } finally {
        if (!cancelled) setIsLoadingDirectory(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, canManageOtherUsers])

  const handleClose = (next: boolean) => {
    if (!next) {
      reset()
      setShowValue(false)
    }
    onOpenChange(next)
  }

  const onValid = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const description = values.description?.trim()
      const scopeValue: CreateSecretScope = values.scope
      await onSubmit({
        key: values.key.trim(),
        value: values.value,
        scope: scopeValue,
        ...(scopeValue === 'user' && values.userId?.trim()
          ? { userId: values.userId.trim().toLowerCase() }
          : {}),
        ...(description ? { description } : {}),
      })
      reset()
      setShowValue(false)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md w-full">
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3 pr-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold">Add Secret</SheetTitle>
              <SheetDescription className="text-sm mt-0.5">
                {scope === 'user'
                  ? 'Store a secret for one participant in this tenant'
                  : 'Securely store a secret for this tenant'}
              </SheetDescription>
            </div>
          </div>
        </div>

        <form
          id="add-secret-form"
          onSubmit={handleSubmit(onValid)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="add-secret-scope">Scope</Label>
            <Controller
              name="scope"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(next) => {
                    field.onChange(next)
                    if (next !== 'user') {
                      setValue('userId', '')
                    }
                  }}
                >
                  <SelectTrigger id="add-secret-scope" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              {scope === 'user'
                ? 'Only this participant can fetch the secret. The participant id is usually their email.'
                : 'Shared across this tenant. Any agent can fetch it.'}
            </p>
          </div>

          {scope === 'user' && (
            <div className="space-y-2">
              <Label htmlFor="add-secret-user">User</Label>
              {!canManageOtherUsers ? (
                <Input
                  id="add-secret-user"
                  value={selfUserId}
                  readOnly
                  disabled
                />
              ) : isLoadingDirectory ? (
                <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading users…
                </div>
              ) : useDirectoryPicker ? (
                <Controller
                  name="userId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger id="add-secret-user" className="w-full">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueDirectory.map((user) => {
                          const participantId = participantIdFromUser(user)
                          return (
                            <SelectItem key={participantId} value={participantId}>
                              {userLabel(user)}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <Input
                  id="add-secret-user"
                  placeholder="participant@example.com"
                  autoComplete="off"
                  spellCheck={false}
                  {...register('userId')}
                />
              )}
              {errors.userId ? (
                <p className="text-xs text-destructive">{errors.userId.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {!canManageOtherUsers
                    ? 'You can only create user-scoped secrets for yourself.'
                    : useDirectoryPicker
                    ? 'The secret is stored for this user. Agents look it up by email.'
                    : 'Enter the user email agents use as the participant id.'}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="add-secret-key">Key</Label>
            <Input
              id="add-secret-key"
              placeholder="e.g. STRIPE_API_KEY"
              autoComplete="off"
              spellCheck={false}
              {...register('key')}
            />
            {errors.key ? (
              <p className="text-xs text-destructive">{errors.key.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Letters, numbers, dots, dashes, and underscores. Must be unique within the
                tenant.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="add-secret-value">Value</Label>
              <button
                type="button"
                onClick={() => setShowValue((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showValue ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Show
                  </>
                )}
              </button>
            </div>
            {showValue ? (
              <Textarea
                id="add-secret-value"
                placeholder="Paste secret value"
                autoComplete="off"
                spellCheck={false}
                rows={4}
                className="font-mono text-sm"
                {...register('value')}
              />
            ) : (
              <Input
                id="add-secret-value"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                spellCheck={false}
                className="font-mono"
                {...register('value')}
              />
            )}
            {errors.value && (
              <p className="text-xs text-destructive">{errors.value.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The value is encrypted at rest and never displayed after saving.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="add-secret-description">
                Description{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {descriptionValue.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <Textarea
              id="add-secret-description"
              placeholder="What is this secret used for? Who owns it?"
              rows={3}
              maxLength={DESCRIPTION_MAX}
              {...register('description')}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                A short note to help your team remember what this secret is for.
              </p>
            )}
          </div>
        </form>

        <SheetFooter className="flex-row justify-end gap-2 px-6 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-secret-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Secret
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
