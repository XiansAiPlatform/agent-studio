'use client'

import { useState } from 'react'
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
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { CreateSecretRequest } from '../types'

const KEY_PATTERN = /^[A-Za-z0-9._-]+$/

// Server-side AdditionalData enforces a per-value max of 2048 chars.
const DESCRIPTION_MAX = 500

const schema = z.object({
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
})

type FormValues = z.infer<typeof schema>

interface AddSecretDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateSecretRequest) => Promise<void>
}

export function AddSecretDialog({ open, onOpenChange, onSubmit }: AddSecretDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showValue, setShowValue] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { key: '', value: '', description: '' },
  })

  const descriptionValue = watch('description') ?? ''

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
      await onSubmit({
        key: values.key.trim(),
        value: values.value,
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
                Securely store a secret for this tenant
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

        <SheetFooter className="flex-row justify-end gap-2 px-6 py-4 border-t">
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
