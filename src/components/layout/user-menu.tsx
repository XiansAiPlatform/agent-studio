'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import {
  LogOut,
  Building2,
  ShieldCheck,
  Palette,
  Check,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/use-tenant';
import { useColorTheme } from '@/hooks/use-color-theme';
import { useTenantStore } from '@/store/tenant-store';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { COLOR_THEMES, type ColorThemeId } from '@/lib/themes';

type Panel = 'main' | 'tenants' | 'themes';

export function UserMenu() {
  const { data: session, status } = useSession();
  const { currentTenant, tenants, switchTenant } = useTenant();
  const { colorTheme, setColorTheme } = useColorTheme();
  const canCustomizeTheme = useTenantStore((s) => s.canCustomizeTheme);
  const hasMultipleTenants = tenants.length > 1;
  const isMobile = useIsMobile();

  // Mobile uses a drill-down pattern (panel state) instead of nested submenus,
  // because Radix submenus open beside the trigger and have nowhere to fit on a
  // narrow screen when the parent menu is already at the right edge.
  const [panel, setPanel] = useState<Panel>('main');

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const user = {
    name: session?.user?.name || 'User',
    email: session?.user?.email || '',
    avatar: session?.user?.image || '',
    initials: session?.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U',
  };

  if (status === 'loading') {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled>
        <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
      </Button>
    );
  }

  const tenantItems = currentTenant
    ? tenants.map(({ tenant: t }) => {
        const isActive = t.id === currentTenant.tenant.id;
        const tLogo = t.metadata?.logo;
        const tLogoSrc = tLogo?.imgBase64
          ? `data:image/png;base64,${tLogo.imgBase64}`
          : tLogo?.url;
        return (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => {
              if (!isActive) switchTenant(t.id);
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="flex items-center justify-center h-5 w-5 rounded overflow-hidden bg-muted shrink-0">
              {tLogoSrc ? (
                <Image
                  src={tLogoSrc}
                  alt={t.name}
                  width={tLogo?.width || 20}
                  height={tLogo?.height || 20}
                  className="object-contain h-full w-full"
                />
              ) : (
                <Building2 className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <span className="flex-1 truncate min-w-0">{t.name}</span>
            {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
          </DropdownMenuItem>
        );
      })
    : null;

  const themeItems = (Object.entries(COLOR_THEMES) as [ColorThemeId, { name: string; primarySwatch: string }][]).map(
    ([id, { name, primarySwatch }]) => (
      <DropdownMenuItem
        key={id}
        onSelect={() => setColorTheme(id)}
        className="flex items-center gap-2"
      >
        <div
          className="h-3.5 w-3.5 rounded-full border border-border/50 shrink-0"
          style={{ backgroundColor: primarySwatch }}
        />
        <span className="flex-1 truncate min-w-0">{name}</span>
        {colorTheme === id && <Check className="h-4 w-4 shrink-0" />}
      </DropdownMenuItem>
    )
  );

  // Drill-down "back" header used in mobile sub-panels.
  const BackHeader = ({ title }: { title: string }) => (
    <button
      type="button"
      onClick={() => setPanel('main')}
      className="flex items-center gap-1 w-full px-2 py-1.5 -mx-1 -mt-1 mb-1 text-sm font-medium border-b hover:bg-accent rounded-t-md"
    >
      <ChevronLeft className="h-4 w-4 shrink-0" />
      <span className="truncate">{title}</span>
    </button>
  );

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setPanel('main');
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-muted"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {user.initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-[min(16rem,calc(100vw-1rem))]"
      >
        {/* Mobile: drill-down panels */}
        {isMobile && panel === 'tenants' && currentTenant && (
          <>
            <BackHeader title="Switch tenant" />
            {tenantItems}
          </>
        )}

        {isMobile && panel === 'themes' && (
          <>
            <BackHeader title="Theme" />
            {themeItems}
          </>
        )}

        {/* Default main panel (always rendered on desktop, conditionally on mobile) */}
        {(!isMobile || panel === 'main') && (
          <>
            <div className="flex items-center gap-3 p-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0 gap-1">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                {session?.user?.isSystemAdmin && (
                  <Badge variant="secondary" className="w-fit text-[10px] px-1.5 py-0 h-4 gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    System Admin
                  </Badge>
                )}
              </div>
            </div>

            <DropdownMenuSeparator />

            {currentTenant && (
              <>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-2 py-1">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Current Tenant</p>
                      <p className="text-sm font-medium truncate">{currentTenant.tenant.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{currentTenant.tenant.id}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>

                {hasMultipleTenants &&
                  (isMobile ? (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setPanel('tenants');
                      }}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowLeftRight className="h-4 w-4 shrink-0" />
                      <span className="flex-1">Switch tenant</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        <span>Switch tenant</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        {tenantItems}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ))}

                <DropdownMenuSeparator />
              </>
            )}

            {canCustomizeTheme ? (
              <>
                {isMobile ? (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setPanel('themes');
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Palette className="h-4 w-4 shrink-0" />
                    <span className="flex-1">Theme</span>
                    <div
                      className="h-3.5 w-3.5 rounded-full border border-border/50 shrink-0"
                      style={{ backgroundColor: COLOR_THEMES[colorTheme].primarySwatch }}
                    />
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      <span>Theme</span>
                      <div
                        className="ml-auto h-3.5 w-3.5 rounded-full border border-border/50 shrink-0"
                        style={{ backgroundColor: COLOR_THEMES[colorTheme].primarySwatch }}
                      />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-44">
                      {themeItems}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuSeparator />
              </>
            ) : null}

            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
