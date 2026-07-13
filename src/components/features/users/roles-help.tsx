'use client'

import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ROLE_LABELS,
  ROLE_METADATA,
  TENANT_ROLES,
  type Role,
} from '@/lib/auth/roles'
import { cn } from '@/lib/utils'

interface RolesHelpProps {
  /**
   * Roles to list in the reference dialog.
   * Defaults to tenant-assignable roles (SysAdmin excluded).
   * Pass `ALL_ROLES` when SysAdmin should be included.
   */
  roles?: readonly Role[]
  className?: string
}

export function RolesHelp({
  roles = TENANT_ROLES,
  className,
}: RolesHelpProps) {
  const includesSysAdmin = roles.includes('SysAdmin')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            'h-6 w-6 text-muted-foreground hover:text-foreground',
            className
          )}
          aria-label="About roles"
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[min(90vh,40rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>About roles</DialogTitle>
          <DialogDescription>
            Roles control what a user can do
            {includesSysAdmin
              ? ' within a tenant and across the platform'
              : ' within this tenant'}
            . A user can hold different roles in different tenants
            {includesSysAdmin ? ', and SysAdmin is evaluated independently' : ''}
            .
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {roles.map((role) => {
            const meta = ROLE_METADATA[role]
            return (
              <div key={role} className="space-y-1.5 border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-sm font-medium">{ROLE_LABELS[role]}</p>
                  <p className="text-xs text-muted-foreground">{meta.scope}</p>
                </div>
                <p className="text-sm text-muted-foreground">{meta.description}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">Typical user:</span>{' '}
                  {meta.typicalUser}
                </p>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
