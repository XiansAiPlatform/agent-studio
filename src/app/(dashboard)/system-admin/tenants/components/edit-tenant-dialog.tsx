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
import { Loader2, Pencil } from 'lucide-react'
import { Tenant, UpdateTenantRequest } from '../types'

const schema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or fewer'),
  domain: z
    .string()
    .max(100, 'Domain must be 100 characters or fewer')
    .regex(
      /^[a-zA-Z0-9._\-+:|=#]+(\.[a-zA-Z]{2,})$/,
      'Enter a valid domain (e.g. acme.com)'
    )
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer')
    .optional()
    .or(z.literal('')),
  timezone: z
    .string()
    .max(50, 'Timezone must be 50 characters or fewer')
    .regex(
      /^[a-zA-Z0-9/._\-+:]+$/,
      'Enter a valid timezone (e.g. America/New_York)'
    )
    .optional()
    .or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

interface EditTenantDialogProps {
  tenant: Tenant | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (tenantId: string, data: UpdateTenantRequest) => Promise<void>
}

export function EditTenantDialog({
  tenant,
  open,
  onOpenChange,
  onSubmit,
}: EditTenantDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', domain: '', description: '', timezone: '' },
  })

  useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name ?? '',
        domain: tenant.domain ?? '',
        description: tenant.description ?? '',
        timezone: tenant.timezone ?? '',
      })
    }
  }, [tenant, reset])

  const onValid = async (values: FormValues) => {
    if (!tenant) return
    setIsSubmitting(true)
    try {
      await onSubmit(tenant.tenantId, {
        name: values.name.trim(),
        domain: values.domain?.trim() || undefined,
        description: values.description?.trim() || undefined,
        timezone: values.timezone?.trim() || undefined,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md w-full">
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3 pr-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold">Edit Tenant</SheetTitle>
              <SheetDescription className="text-sm mt-0.5">
                {tenant ? `Update “${tenant.tenantId}”` : 'Update tenant details'}
              </SheetDescription>
            </div>
          </div>
        </div>

        <form
          id="edit-tenant-form"
          onSubmit={handleSubmit(onValid)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          <div className="space-y-2">
            <Label>Tenant ID</Label>
            <Input value={tenant?.tenantId ?? ''} disabled readOnly />
            <p className="text-xs text-muted-foreground">
              The tenant ID cannot be changed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tenant-name">Name</Label>
            <Input id="edit-tenant-name" autoComplete="off" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tenant-domain">Domain (optional)</Label>
            <Input
              id="edit-tenant-domain"
              placeholder="acme.com"
              autoComplete="off"
              {...register('domain')}
            />
            {errors.domain && (
              <p className="text-xs text-destructive">{errors.domain.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tenant-timezone">Timezone (optional)</Label>
            <Input
              id="edit-tenant-timezone"
              placeholder="America/New_York"
              autoComplete="off"
              {...register('timezone')}
            />
            {errors.timezone && (
              <p className="text-xs text-destructive">{errors.timezone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tenant-description">Description (optional)</Label>
            <Textarea
              id="edit-tenant-description"
              rows={3}
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
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-tenant-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
