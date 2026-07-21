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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Building2 } from 'lucide-react'
import { CreateTenantRequest } from '../types'

const schema = z.object({
  tenantId: z
    .string()
    .min(1, 'Tenant ID is required')
    .max(50, 'Tenant ID must be 50 characters or fewer')
    .regex(
      /^[a-zA-Z0-9._@-]+$/,
      'Only letters, numbers and . _ @ - are allowed'
    ),
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
  useSpecificTemporalNamespace: z.boolean(),
  temporalHost: z.string().optional().or(z.literal('')),
  temporalNamespace: z.string().optional().or(z.literal('')),
  temporalCertificate: z.string().optional().or(z.literal('')),
  temporalCertificateKey: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.useSpecificTemporalNamespace) {
    if (!data.temporalHost?.trim())
      ctx.addIssue({ code: 'custom', path: ['temporalHost'], message: 'Host is required' })
    if (!data.temporalNamespace?.trim())
      ctx.addIssue({ code: 'custom', path: ['temporalNamespace'], message: 'Namespace is required' })
  }
})

type FormValues = z.infer<typeof schema>

interface AddTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTenantRequest) => Promise<void>
}

export function AddTenantDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddTenantDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantId: '',
      name: '',
      domain: '',
      description: '',
      timezone: '',
      useSpecificTemporalNamespace: false,
      temporalHost: '',
      temporalNamespace: 'default',
      temporalCertificate: '',
      temporalCertificateKey: '',
    },
  })

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const onValid = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        tenantId: values.tenantId.trim(),
        name: values.name.trim(),
        domain: values.domain?.trim() || undefined,
        description: values.description?.trim() || undefined,
        timezone: values.timezone?.trim() || undefined,
        useSpecificTemporalNamespace: values.useSpecificTemporalNamespace,
        temporalHost: values.temporalHost?.trim() || undefined,
        temporalNamespace: values.temporalNamespace?.trim() || undefined,
        temporalCertificate: values.temporalCertificate?.trim() || undefined,
        temporalCertificateKey: values.temporalCertificateKey?.trim() || undefined,
      })
      reset()
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
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold">New Tenant</SheetTitle>
              <SheetDescription className="text-sm mt-0.5">
                Create a new tenant on the platform
              </SheetDescription>
            </div>
          </div>
        </div>

        <form
          id="add-tenant-form"
          onSubmit={handleSubmit(onValid)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="add-tenant-id">Tenant ID</Label>
            <Input
              id="add-tenant-id"
              placeholder="acme-corp"
              autoComplete="off"
              {...register('tenantId')}
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier used across the platform. Cannot be changed later.
            </p>
            {errors.tenantId && (
              <p className="text-xs text-destructive">{errors.tenantId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-tenant-name">Name</Label>
            <Input
              id="add-tenant-name"
              placeholder="Acme Corp"
              autoComplete="off"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-tenant-domain">Domain (optional)</Label>
            <Input
              id="add-tenant-domain"
              placeholder="acme.com"
              autoComplete="off"
              {...register('domain')}
            />
            {errors.domain && (
              <p className="text-xs text-destructive">{errors.domain.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-tenant-timezone">Timezone (optional)</Label>
            <Input
              id="add-tenant-timezone"
              placeholder="America/New_York"
              autoComplete="off"
              {...register('timezone')}
            />
            {errors.timezone && (
              <p className="text-xs text-destructive">{errors.timezone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-tenant-description">Description (optional)</Label>
            <Textarea
              id="add-tenant-description"
              placeholder="Short description of this tenant"
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="add-tenant-use-specific-temporal-namespace"
              checked={watch('useSpecificTemporalNamespace')}
              onCheckedChange={(checked) =>
                setValue('useSpecificTemporalNamespace', checked === true)
              }
              className="mt-0.5"
            />
            <Label
              htmlFor="add-tenant-use-specific-temporal-namespace"
              className="font-normal leading-snug"
            >
              Use a specific Temporal namespace for this tenant
            </Label>
          </div>

          {watch('useSpecificTemporalNamespace') && (
            <div className="rounded-md border p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-tenant-temporal-host">Temporal Host</Label>
                <Input
                  id="add-tenant-temporal-host"
                  placeholder="my-temporal-server:7233"
                  autoComplete="off"
                  {...register('temporalHost')}
                />
                {errors.temporalHost && (
                  <p className="text-xs text-destructive">{errors.temporalHost.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-tenant-temporal-namespace">Namespace</Label>
                <Input
                  id="add-tenant-temporal-namespace"
                  placeholder="tenant-acme"
                  autoComplete="off"
                  {...register('temporalNamespace')}
                />
                {errors.temporalNamespace && (
                  <p className="text-xs text-destructive">{errors.temporalNamespace.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-tenant-temporal-certificate">Client Certificate (PEM)</Label>
                <Textarea
                  id="add-tenant-temporal-certificate"
                  placeholder="-----BEGIN CERTIFICATE-----&#10;..."
                  rows={4}
                  className="font-mono text-xs"
                  {...register('temporalCertificate')}
                />
                {errors.temporalCertificate && (
                  <p className="text-xs text-destructive">{errors.temporalCertificate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-tenant-temporal-certificate-key">Certificate Key (PEM)</Label>
                <Textarea
                  id="add-tenant-temporal-certificate-key"
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;..."
                  rows={4}
                  className="font-mono text-xs"
                  {...register('temporalCertificateKey')}
                />
                {errors.temporalCertificateKey && (
                  <p className="text-xs text-destructive">{errors.temporalCertificateKey.message}</p>
                )}
              </div>
            </div>
          )}
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
          <Button type="submit" form="add-tenant-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Tenant
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
