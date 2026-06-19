'use client'

import { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Loader2, UserPlus, Plus, X, Building2 } from 'lucide-react'
import {
  TENANT_ROLES,
  TenantRole,
  roleLabel,
  NewUserFormData,
} from '../types'
import type { Tenant } from '@/app/(dashboard)/system-admin/tenants/types'

const membershipSchema = z.object({
  tenantId: z.string().min(1, 'Select a tenant'),
  role: z.enum(TENANT_ROLES),
})

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  isSysAdmin: z.boolean(),
  isEnabled: z.boolean(),
  memberships: z
    .array(membershipSchema)
    .min(1, 'Add at least one tenant membership')
    .refine(
      (items) => new Set(items.map((m) => m.tenantId)).size === items.length,
      { message: 'Each tenant can only appear once' }
    ),
})

type FormValues = z.infer<typeof schema>

interface AddUserDialogProps {
  /**
   * Pre-selected tenant ID. When provided the first membership row is
   * initialised with this value so the user doesn't have to pick it.
   */
  selectedTenantId?: string
  /** Display name for the selected tenant (shown in the subtitle). */
  selectedTenantName?: string
  /** All available tenants — shown in the tenant pickers. */
  tenants: Tenant[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: NewUserFormData) => Promise<void>
}

export function AddUserDialog({
  selectedTenantId,
  selectedTenantName,
  tenants,
  open,
  onOpenChange,
  onSubmit,
}: AddUserDialogProps) {
  const defaultMembership = {
    tenantId: selectedTenantId ?? '',
    role: 'TenantParticipant' as TenantRole,
  }

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      isSysAdmin: false,
      isEnabled: true,
      memberships: [defaultMembership],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'memberships' })

  // Re-initialise form when the dialog opens.
  useEffect(() => {
    if (open) {
      reset({
        name: '',
        email: '',
        isSysAdmin: false,
        isEnabled: true,
        memberships: [defaultMembership],
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const watchedMemberships = watch('memberships')
  const selectedTenantIds = new Set(watchedMemberships.map((m) => m.tenantId).filter(Boolean))

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const onValid = async (values: FormValues) => {
    await onSubmit({
      name: values.name.trim(),
      email: values.email.trim(),
      isSysAdmin: values.isSysAdmin,
      isEnabled: values.isEnabled,
      memberships: values.memberships.map((m) => ({
        tenantId: m.tenantId,
        role: m.role as TenantRole,
      })),
    })
    reset()
    onOpenChange(false)
  }

  const subtitle = selectedTenantName
    ? `Add a user to "${selectedTenantName}"`
    : 'Fill in the details and add the user to one or more tenants'

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="flex flex-col sm:max-w-lg w-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold">New User</SheetTitle>
              <SheetDescription className="text-sm mt-0.5">{subtitle}</SheetDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <form
          id="add-user-form"
          onSubmit={handleSubmit(onValid)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
        >
          {/* ── Basic info ── */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-user-name">Name</Label>
              <Input
                id="add-user-name"
                placeholder="Jane Doe"
                autoComplete="off"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-user-email">Email</Label>
              <Input
                id="add-user-email"
                type="email"
                placeholder="jane@acme.com"
                autoComplete="off"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* ── Account settings ── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Account settings
            </p>

            <Controller
              control={control}
              name="isEnabled"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium leading-none">Enabled</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allow the user to sign in
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            <Controller
              control={control}
              name="isSysAdmin"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium leading-none">System Admin</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Grant platform-wide administrator access
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          </div>

          <Separator />

          {/* ── Tenant memberships ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tenant memberships
              </p>
              <span className="text-xs text-muted-foreground">Required</span>
            </div>

            {typeof errors.memberships?.message === 'string' && (
              <p className="text-xs text-destructive">{errors.memberships.message}</p>
            )}

            <div className="space-y-2">
              {fields.map((field, index) => {
                const rowErrors = errors.memberships?.[index]
                // Tenants available for this row = all tenants minus those already
                // selected in OTHER rows.
                const rowTenantId = watchedMemberships[index]?.tenantId ?? ''
                const available = tenants.filter(
                  (t) => t.tenantId === rowTenantId || !selectedTenantIds.has(t.tenantId)
                )
                return (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Controller
                        control={control}
                        name={`memberships.${index}.tenantId`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger className="h-9 text-sm">
                              <Building2 className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground" />
                              <SelectValue placeholder="Select a tenant…" />
                            </SelectTrigger>
                            <SelectContent>
                              {available.map((t) => (
                                <SelectItem key={t.tenantId} value={t.tenantId}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {rowErrors?.tenantId && (
                        <p className="text-xs text-destructive">{rowErrors.tenantId.message}</p>
                      )}
                    </div>

                    <div className="w-40 space-y-1">
                      <Controller
                        control={control}
                        name={`memberships.${index}.role`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              {TENANT_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {roleLabel(r)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {rowErrors?.role && (
                        <p className="text-xs text-destructive">{rowErrors.role.message}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="mt-2 shrink-0 rounded p-1 text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-30 focus:outline-none"
                      aria-label="Remove tenant"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Add tenant row */}
            {fields.length < tenants.length && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ tenantId: '', role: 'TenantParticipant' })
                }
                className="gap-1.5 text-xs h-8"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another tenant
              </Button>
            )}
          </div>
        </form>

        {/* Footer */}
        <SheetFooter className="flex-row justify-end gap-2 px-6 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] border-t shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-user-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create User
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
