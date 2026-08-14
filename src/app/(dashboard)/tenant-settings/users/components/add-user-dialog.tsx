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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, Loader2, UserPlus } from 'lucide-react'
import { ApiRequestError } from '@/lib/api/request-error'
import { RolesHelp } from '@/components/features/users/roles-help'
import {
  AddTenantUserRequest,
  TenantRole,
  TENANT_ROLES,
  TENANT_ROLE_LABELS,
  ROLE_METADATA,
} from '../types'

/**
 * `mode` decides which fields identify the person being added, so it is part of
 * the form rather than component state — the validation rules differ per mode.
 */
const schema = z
  .object({
    mode: z.enum(['new', 'existing']),
    userId: z.string().trim(),
    email: z.string().trim(),
    name: z.string().trim(),
    roles: z.array(z.enum(TENANT_ROLES)).min(1, 'Select at least one role'),
  })
  .superRefine((values, ctx) => {
    if (values.mode === 'existing') {
      if (!values.userId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['userId'],
          message: 'User ID is required',
        })
      } else if (values.userId.includes('@')) {
        // An address can match accounts from more than one identity provider,
        // so it never identifies the account to add.
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['userId'],
          message: 'This looks like an email address. Enter the account\'s user id instead.',
        })
      }
      return
    }

    if (!z.string().email().safeParse(values.email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Please enter a valid email address',
      })
    }
    if (!values.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'Name is required',
      })
    } else if (values.name.length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'Name is too long',
      })
    }
  })

type FormValues = z.infer<typeof schema>

const EMPTY_FORM: FormValues = {
  mode: 'new',
  userId: '',
  email: '',
  name: '',
  roles: ['TenantParticipant'],
}

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AddTenantUserRequest) => Promise<void>
}

export function AddUserDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  /**
   * The most recent failure. `takenEmail` is set only for the conflict that
   * requires a user id, so the extra explanation disappears again once a later
   * attempt fails for some other reason.
   */
  const [submitError, setSubmitError] = useState<{
    message: string
    takenEmail?: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  })

  const mode = watch('mode')
  const selectedRoles = watch('roles')

  const toggleRole = (role: TenantRole) => {
    if (selectedRoles.includes(role)) {
      setValue('roles', selectedRoles.filter((r) => r !== role), { shouldValidate: true })
    } else {
      setValue('roles', [...selectedRoles, role], { shouldValidate: true })
    }
  }

  const resetAll = () => {
    reset(EMPTY_FORM)
    setSubmitError(null)
  }

  const switchMode = (next: FormValues['mode']) => {
    setValue('mode', next)
    setSubmitError(null)
  }

  const handleClose = (open: boolean) => {
    if (!open) resetAll()
    onOpenChange(open)
  }

  const onValid = async (values: FormValues) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(
        values.mode === 'existing'
          ? { userId: values.userId, roles: values.roles as TenantRole[] }
          : {
              email: values.email,
              name: values.name,
              roles: values.roles as TenantRole[],
            }
      )
      resetAll()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add user'
      // A 409 on the create path means an account already holds this address, so
      // the tenant can only be joined by naming that account's user id.
      const isEmailTaken =
        err instanceof ApiRequestError &&
        err.status === 409 &&
        values.mode === 'new'
      setSubmitError({
        message,
        ...(isEmailTaken ? { takenEmail: values.email } : {}),
      })
      if (isEmailTaken) setValue('mode', 'existing')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="flex flex-col sm:max-w-xl w-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3 pr-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold">Add User</SheetTitle>
              <SheetDescription className="text-sm mt-0.5">
                {mode === 'existing'
                  ? 'Add an existing account to this tenant by user id'
                  : 'Create a new user in this tenant'}
              </SheetDescription>
            </div>
          </div>
        </div>

        {/* Form body */}
        <form
          id="add-user-form"
          onSubmit={handleSubmit(onValid)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {submitError.takenEmail
                  ? 'This email address is already in use'
                  : 'Could not add user'}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{submitError.message}</p>
                {submitError.takenEmail && (
                  <p>
                    An account already exists for{' '}
                    <span className="font-medium">{submitError.takenEmail}</span>.
                    Adding it here grants that existing account access to this tenant
                    rather than creating a user, and because one address can belong to
                    more than one account, the address alone does not say which
                    account to grant. Enter that account&apos;s user id below. If you
                    don&apos;t have it, ask a system administrator — tenant admins can
                    only look up users who are already members of this tenant.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {mode === 'existing' ? (
            <div className="space-y-2">
              <Label htmlFor="add-user-id">User ID</Label>
              <Input
                id="add-user-id"
                placeholder="e.g. 6f1c2b9e-4a7d-4f10-9c3e-2b8a1d5e7f04"
                autoComplete="off"
                {...register('userId')}
              />
              {errors.userId ? (
                <p className="text-xs text-destructive">{errors.userId.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Identifies an account that already exists. Ask a system
                  administrator if you don&apos;t have it.
                </p>
              )}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => switchMode('new')}
              >
                Create a new user instead
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email address</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="user@example.com"
                  autoComplete="off"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-name">Full name</Label>
                <Input
                  id="add-name"
                  placeholder="Jane Doe"
                  autoComplete="off"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => switchMode('existing')}
                >
                  Add an existing account by user id instead
                </Button>
              </div>
            </>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label>Roles</Label>
              <RolesHelp />
            </div>
            <div className="rounded-lg border divide-y">
              {TENANT_ROLES.map((role) => (
                <label
                  key={role}
                  htmlFor={`add-role-${role}`}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <Checkbox
                    id={`add-role-${role}`}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{TENANT_ROLE_LABELS[role]}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ROLE_METADATA[role].summary}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {errors.roles && (
              <p className="text-xs text-destructive">{errors.roles.message}</p>
            )}
          </div>
        </form>

        {/* Footer */}
        <SheetFooter className="flex-row justify-end gap-2 px-6 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] border-t">
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
            {mode === 'existing' ? 'Add Existing User' : 'Add User'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
