'use client';

import { Building2, Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { TenantSelector } from './tenant-selector';
import { useTenant } from '@/hooks/use-tenant';
import { useParticipantLayout } from '@/contexts/participant-layout-context';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  /** Admin-mode handler that opens the mobile sidebar drawer. */
  onOpenSidebar?: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps = {}) {
  const { currentTenant } = useTenant();
  const { isParticipantMode, onOpenMenu } = useParticipantLayout();

  // Get tenant logo
  const logo = currentTenant?.tenant.metadata?.logo;
  const logoSrc = logo?.imgBase64 ? `data:image/png;base64,${logo.imgBase64}` : logo?.url;

  // Pick the right hamburger handler based on layout mode.
  const onHamburgerClick = isParticipantMode ? onOpenMenu : onOpenSidebar;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-pt">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-4 sm:px-4 md:px-6">
        {/* Mobile hamburger - opens sidebar drawer (admin) or participant menu */}
        {onHamburgerClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onHamburgerClick}
            className="md:hidden h-9 w-9 -ml-1 shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Tenant Logo / Branding */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0"
        >
          <div className="flex items-center justify-center max-h-10 max-w-[80px] shrink-0">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={currentTenant?.tenant.name || 'Logo'}
                width={logo?.width || 40}
                height={logo?.height || 40}
                className="object-contain max-h-10 w-auto"
                priority
                unoptimized
              />
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold leading-none truncate">
              {currentTenant?.tenant.name || 'Agent Studio'}
            </span>
            <span className="hidden sm:block text-[10px] text-muted-foreground leading-none mt-0.5">
              Agent Studio
            </span>
          </div>
        </Link>

        {/* Tenant Selector - next to logo */}
        <div className="hidden sm:flex items-center gap-3">
          <TenantSelector />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
