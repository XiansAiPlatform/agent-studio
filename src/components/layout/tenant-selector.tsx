'use client';

import { Building2, Check, ChevronDown, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useTenant } from '@/hooks/use-tenant';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function TenantSelector() {
  const { tenants, currentTenant, switchTenant } = useTenant();

  // If no current tenant, return null (logo shows in header)
  if (!currentTenant) {
    return null;
  }

  const { tenant, role } = currentTenant;

  // If only one tenant, don't show selector
  if (tenants.length === 1) {
    return null;
  }

  // If multiple tenants, show a simple dropdown selector
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal hover:bg-muted"
        >
          <span className="text-muted-foreground">Switch to</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {tenants.map(({ tenant: t, role: r }) => {
          const isActive = t.id === tenant.id;
          const tLogo = t.metadata?.logo;
          const tLogoSrc = tLogo?.imgBase64 ? `data:image/png;base64,${tLogo.imgBase64}` : tLogo?.url;
          
          return (
            <DropdownMenuItem
              key={t.id}
              onClick={() => switchTenant(t.id)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="flex items-center justify-center h-6 w-6 rounded overflow-hidden bg-muted">
                {tLogoSrc ? (
                  <Image 
                    src={tLogoSrc} 
                    alt={t.name}
                    width={tLogo?.width || 24}
                    height={tLogo?.height || 24}
                    className="object-contain h-full w-full"
                  />
                ) : (
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <span className="flex-1 truncate text-sm">{t.name}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
