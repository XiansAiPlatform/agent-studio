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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, UserPlus } from 'lucide-react'
import { RolesHelp } from '@/components/features/users/roles-help'
import {
  CreateUserRequest,
  TenantRole,
  TENANT_ROLES,
  TENANT_ROLE_LABELS,
  ROLE_METADATA,
} from '../types'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  roles: z
    .array(z.enum(TENANT_ROLES))
    .min(1, 'Select at least one role'),
})

type FormValues = z.infer<typeof schema>

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateUserRequest) => Promise<void>
}

export function AddUserDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddUserDialogProps) {
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
      email: '',
      name: '',
      roles: ['TenantParticipant'],
    },
  })

  const selectedRoles = watch('roles')

  const toggleRole = (role: TenantRole) => {
    if (selectedRoles.includes(role)) {
      setValue('roles', selectedRoles.filter((r) => r !== role), { shouldValidate: true })
    } else {
      setValue('roles', [...selectedRoles, role], { shouldValidate: true })
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const onValid = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        email: values.email,
        name: values.name,
        roles: values.roles as TenantRole[],
      })
      reset()
      onOpenChange(false)
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
                Add a new user to this tenant
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
          </div>

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
            Add User
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
