'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Eye, EyeOff, Loader2, Pencil } from 'lucide-react'
import {
  getSecretDescription,
  type AgentNameMap,
  type TenantSecret,
  type UpdateSecretRequest,
} from '../types'
import { SecretScopeBadge } from './secret-scope-badge'

// Server-side AdditionalData enforces a per-value max of 2048 chars.
const DESCRIPTION_MAX = 500

const schema = z.object({
  value: z.string().refine((v) => v.trim().length > 0, 'New value is required'),
  description: z
    .string()
    .max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or less`),
})

type FormValues = z.infer<typeof schema>

interface EditSecretDialogProps {
  /** The secret being edited; the dialog is open while this is set. */
  secret: TenantSecret | null
  agentNames?: AgentNameMap
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UpdateSecretRequest) => Promise<void>
}

export function EditSecretDialog({
  secret,
  agentNames,
  onOpenChange,
  onSubmit,
}: EditSecretDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showValue, setShowValue] = useState(false)
  const currentDescription = secret ? getSecretDescription(secret) ?? '' : ''

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { value: '', description: '' },
  })

  // Start each edit with an empty value field and the secret's current description.
  useEffect(() => {
    reset({ value: '', description: currentDescription })
    setShowValue(false)
  }, [secret?.id, currentDescription, reset])

  const descriptionValue = watch('description') ?? ''

  const handleClose = (next: boolean) => {
    if (!next) {
      reset({ value: '', description: '' })
      setShowValue(false)
    }
    onOpenChange(next)
  }

  const onValid = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const description = values.description.trim()
      await onSubmit({
        value: values.value,
        // Only send the description when it changed, so other edits leave it alone.
        ...(description !== currentDescription ? { description } : {}),
      })
      handleClose(false)
    } catch {
      // The page shows the error; keep the dialog open so the user can retry.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={secret !== null} onOpenChange={handleClose}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md w-full">
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3 pr-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold">Edit Secret</SheetTitle>
              <SheetDescription className="text-sm mt-0.5">
                Replace the value of an existing secret
              </SheetDescription>
            </div>
          </div>
        </div>

        <form
          id="edit-secret-form"
          onSubmit={handleSubmit(onValid)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {secret && (
            <div className="space-y-2">
              <Label>Key</Label>
              <div className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-foreground bg-muted/60 rounded px-1.5 py-0.5 text-sm break-all">
                  {secret.key}
                </code>
                <SecretScopeBadge secret={secret} agentNames={agentNames} />
              </div>
              <p className="text-xs text-muted-foreground">
                The key and scope can&apos;t be changed. To change them, create a new secret.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-secret-value">New value</Label>
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
                id="edit-secret-value"
                placeholder="Paste new secret value"
                autoComplete="off"
                spellCheck={false}
                rows={4}
                className="font-mono text-sm"
                {...register('value')}
              />
            ) : (
              <Input
                id="edit-secret-value"
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
              Saving replaces the current value immediately. Agents get the new value the
              next time they fetch it.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-secret-description">
                Description{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {descriptionValue.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <Textarea
              id="edit-secret-description"
              placeholder="What is this secret used for? Who owns it?"
              rows={3}
              maxLength={DESCRIPTION_MAX}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
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
          <Button type="submit" form="edit-secret-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
