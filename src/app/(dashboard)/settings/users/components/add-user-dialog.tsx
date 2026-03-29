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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, UserPlus } from 'lucide-react'
import { CreateUserRequest, ParticipantRole } from '../types'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  role: z.enum(['TenantParticipant', 'TenantParticipantAdmin']),
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
      role: 'TenantParticipant',
    },
  })

  const selectedRole = watch('role')

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
        role: values.role as ParticipantRole,
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
            <Label htmlFor="add-role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue('role', value as ParticipantRole)}
            >
              <SelectTrigger id="add-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TenantParticipant">User</SelectItem>
                <SelectItem value="TenantParticipantAdmin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-xs text-destructive">{errors.role.message}</p>
            )}
          </div>
        </form>

        {/* Footer */}
        <SheetFooter className="flex-row justify-end gap-2 px-6 py-4 border-t">
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
