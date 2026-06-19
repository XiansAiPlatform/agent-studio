'use client'

import { useState, useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Loader2, UserCog } from 'lucide-react'
import { TenantUser, UpdateUserRequest, TenantRole, TENANT_ROLES, TENANT_ROLE_LABELS } from '../types'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  roles: z
    .array(z.enum(TENANT_ROLES))
    .min(1, 'Select at least one role'),
  isApproved: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface EditUserDialogProps {
  user: TenantUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (userId: string, data: UpdateUserRequest) => Promise<void>
  isSelf?: boolean
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  isSelf = false,
}: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      roles: ['TenantParticipant'],
      isApproved: true,
    },
  })

  useEffect(() => {
    if (user) {
      const validRoles = user.roles.filter((r): r is TenantRole =>
        TENANT_ROLES.includes(r as TenantRole)
      )
      reset({
        name: user.name,
        email: user.email,
        roles: validRoles.length > 0 ? validRoles : ['TenantParticipant'],
        isApproved: user.isApproved,
      })
    }
  }, [user, reset])

  const selectedRoles = watch('roles') as TenantRole[]
  const isApprovedValue = watch('isApproved')

  const toggleRole = (role: TenantRole) => {
    if (selectedRoles.includes(role)) {
      setValue('roles', selectedRoles.filter((r) => r !== role), { shouldValidate: true })
    } else {
      setValue('roles', [...selectedRoles, role], { shouldValidate: true })
    }
  }

  const onValid = async (values: FormValues) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      await onSubmit(user.userId, {
        name: values.name,
        email: values.email,
        roles: values.roles as TenantRole[],
        isApproved: values.isApproved,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md w-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3 pr-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserCog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold">Edit User</SheetTitle>
              <SheetDescription className="text-sm mt-0.5">
                {user?.name ?? 'Update user details'}
              </SheetDescription>
            </div>
          </div>
        </div>

        {/* Form body */}
        <form
          id="edit-user-form"
          onSubmit={handleSubmit(onValid)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full name</Label>
            <Input id="edit-name" autoComplete="off" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email address</Label>
            <Input
              id="edit-email"
              type="email"
              autoComplete="off"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="rounded-lg border divide-y">
              {TENANT_ROLES.map((role) => (
                <label
                  key={role}
                  htmlFor={`edit-role-${role}`}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <Checkbox
                    id={`edit-role-${role}`}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <span className="text-sm font-medium">{TENANT_ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
            {errors.roles && (
              <p className="text-xs text-destructive">{errors.roles.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Approved</p>
              <p className="text-xs text-muted-foreground">
                {isSelf
                  ? "You can't change your own approval status"
                  : 'Unapproved users cannot access this tenant'}
              </p>
            </div>
            <Switch
              checked={isApprovedValue}
              onCheckedChange={(val) => setValue('isApproved', val)}
              disabled={isSelf}
            />
          </div>
        </form>

        {/* Footer */}
        <SheetFooter className="flex-row justify-end gap-2 px-6 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-user-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
