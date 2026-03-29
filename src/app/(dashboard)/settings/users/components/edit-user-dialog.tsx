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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, UserCog } from 'lucide-react'
import { TenantUser, UpdateUserRequest, ParticipantRole } from '../types'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['TenantParticipant', 'TenantParticipantAdmin']),
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
      role: 'TenantParticipant',
      isApproved: true,
    },
  })

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      })
    }
  }, [user, reset])

  const selectedRole = watch('role')
  const isApprovedValue = watch('isApproved')

  const onValid = async (values: FormValues) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      await onSubmit(user.userId, {
        name: values.name,
        email: values.email,
        role: values.role as ParticipantRole,
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
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue('role', value as ParticipantRole)}
            >
              <SelectTrigger id="edit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TenantParticipant">User</SelectItem>
                <SelectItem value="TenantParticipantAdmin">Admin</SelectItem>
              </SelectContent>
            </Select>
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
        <SheetFooter className="flex-row justify-end gap-2 px-6 py-4 border-t">
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
