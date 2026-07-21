'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLE_LABELS, ROLE_METADATA, type TenantRole } from '@/lib/auth/roles'

type RoleSelectItemProps = Omit<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>,
  'value' | 'children'
> & {
  role: TenantRole
}

/**
 * Role option for Select menus: shows the display name plus a short summary
 * in the open list, while SelectValue only reflects the display name.
 */
export const RoleSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  RoleSelectItemProps
>(({ role, className, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    value={role}
    className={cn(
      'relative flex w-full cursor-default select-none items-start rounded-sm py-2 pl-8 pr-3 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 top-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <div className="min-w-0 flex-1 space-y-0.5">
      <SelectPrimitive.ItemText>{ROLE_LABELS[role]}</SelectPrimitive.ItemText>
      <p className="text-xs text-muted-foreground leading-snug whitespace-normal break-words">
        {ROLE_METADATA[role].summary}
      </p>
    </div>
  </SelectPrimitive.Item>
))
RoleSelectItem.displayName = 'RoleSelectItem'
