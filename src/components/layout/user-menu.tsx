'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import {
  LogOut,
  Building2,
  ShieldCheck,
  Check,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/hooks/use-tenant';
import { useIsMobile } from '@/hooks/use-is-mobile';

type Panel = 'main' | 'tenants';

// Above this many tenants, show a search box so large tenant lists stay usable.
const SEARCH_THRESHOLD = 8;

export function UserMenu() {
  const { data: session, status } = useSession();
  const { currentTenant, tenants, switchTenant } = useTenant();
  const hasMultipleTenants = tenants.length > 1;
  const isMobile = useIsMobile();

  // Mobile uses a drill-down pattern (panel state) instead of nested submenus,
  // because Radix submenus open beside the trigger and have nowhere to fit on a
  // narrow screen when the parent menu is already at the right edge.
  const [panel, setPanel] = useState<Panel>('main');
  const [tenantQuery, setTenantQuery] = useState('');

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const user = {
    name: session?.user?.name || 'User',
    email: session?.user?.email || '',
    avatar: session?.user?.image || '',
    initials: session?.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U',
  }

  const tenantRoleLabel = currentTenant?.roleLabel ?? null;

  if (status === 'loading') {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled>
        <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
      </Button>
    );
  }

  const showTenantSearch = tenants.length > SEARCH_THRESHOLD;

  const filteredTenants = (() => {
    const q = tenantQuery.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      ({ tenant: t }) =>
        t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    );
  })();

  const tenantItems = currentTenant
    ? filteredTenants.map(({ tenant: t }) => {
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
                  unoptimized
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

  // Drill-down "back" header used in mobile sub-panels.
  const BackHeader = ({ title }: { title: string }) => (
    <button
      type="button"
      onClick={() => {
        setPanel('main');
        setTenantQuery('');
      }}
      className="flex items-center gap-1 w-full px-2 py-1.5 -mx-1 -mt-1 mb-1 text-sm font-medium border-b hover:bg-accent rounded-t-md"
    >
      <ChevronLeft className="h-4 w-4 shrink-0" />
      <span className="truncate">{title}</span>
    </button>
  );

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          setPanel('main');
          setTenantQuery('');
        }
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
            {showTenantSearch && (
              <div className="p-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={tenantQuery}
                    onChange={(e) => setTenantQuery(e.target.value)}
                    placeholder="Search tenants…"
                    className="h-9 pl-8 text-base"
                    onKeyDown={(e) => {
                      if (e.key !== 'Escape') e.stopPropagation();
                    }}
                  />
                </div>
              </div>
            )}
            <div className="max-h-[50vh] overflow-y-auto">
              {filteredTenants.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No tenants found
                </div>
              ) : (
                tenantItems
              )}
            </div>
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
                {tenantRoleLabel && (
                  <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0 h-4">
                    {tenantRoleLabel}
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
                      <p className="text-sm font-medium truncate">{currentTenant.tenant.name} ({currentTenant.tenant.id})</p>
                    </div>
                  </div>
                </DropdownMenuLabel>

                {/* Tenant switching lives in the header TenantSelector on desktop;
                    on mobile that selector is hidden, so keep this drill-down. */}
                {hasMultipleTenants && isMobile && (
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
                )}

                <DropdownMenuSeparator />
              </>
            )}

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
