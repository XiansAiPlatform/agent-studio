'use client';

import { Building2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { TenantSelector } from './tenant-selector';
import { useTenant } from '@/hooks/use-tenant';

export function Header() {
  const { currentTenant } = useTenant();
  
  // Get tenant logo
  const logo = currentTenant?.tenant.metadata?.logo;
  const logoSrc = logo?.imgBase64 ? `data:image/png;base64,${logo.imgBase64}` : logo?.url;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-6">
        {/* Tenant Logo / Branding */}
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-center h-20 w-20">
            {logoSrc ? (
              <Image 
                src={logoSrc} 
                alt={currentTenant?.tenant.name || 'Logo'}
                width={logo?.width || 40}
                height={logo?.height || 40}
                className="object-contain h-full w-full"
                priority
              />
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none">
              {currentTenant?.tenant.name || 'Agent Studio'}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
              Agent Studio
            </span>
          </div>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <TenantSelector />
          <div className="h-4 w-px bg-border/60" />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
