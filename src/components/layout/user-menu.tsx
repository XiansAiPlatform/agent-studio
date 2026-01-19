'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Building2, LogOut, Search, Plus, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/hooks/use-tenant';

export function UserMenu() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { tenants, currentTenant, currentTenantId, switchTenant, isLoading } = useTenant();
  const [tenantSearch, setTenantSearch] = useState('');

  const handleTenantSwitch = (tenantId: string) => {
    switchTenant(tenantId);
    setTenantSearch('');
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };
  
  // Get user info from session
  const user = {
    name: session?.user?.name || 'User',
    email: session?.user?.email || '',
    avatar: session?.user?.image || '',
    initials: session?.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U',
  };
  
  // Show loading state
  if (status === 'loading') {
    return (
      <Button variant="ghost" className="h-8 w-8 rounded-full" disabled>
        <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
      </Button>
    );
  }

  // Filter tenants based on search
  const filteredTenants = tenants.filter((t) =>
    t.tenant.name.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 gap-2 px-2 transition-all hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-0"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm hidden sm:inline-block max-w-[100px] truncate">
            {user.name}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="end" forceMount>
        {/* User Info */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Current Tenant */}
        {currentTenant && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-2 py-1.5">
              Current Workspace
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                // Refresh the current tenant (re-select it to force a refresh)
                handleTenantSwitch(currentTenant.tenant.id)
              }}
              className="cursor-pointer bg-primary/5 border border-primary/20 rounded mx-1 px-2 py-2.5"
            >
              <div className="flex items-center gap-2.5 w-full">
                <div className="flex items-center justify-center h-7 w-7 rounded bg-primary/15 border border-primary/30 flex-shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{currentTenant.tenant.name}</span>
                    <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground/60 truncate">
                      {currentTenant.tenant.slug}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">•</span>
                    <span className="text-[10px] capitalize px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {currentTenant.role}
                    </span>
                  </div>
                </div>
                <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              </div>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Tenant Switching with Search */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Building2 className="h-4 w-4" />
            <span>Switch Workspace</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-72 p-0">
            <div className="p-2 border-b bg-muted/30">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  placeholder="Search workspaces..."
                  className="pl-8 h-8 text-xs border-border/40 focus-visible:border-primary/40"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1.5">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground/60">
                  Loading workspaces...
                </div>
              ) : filteredTenants.length > 0 ? (
                <div className="space-y-0.5">
                  {filteredTenants.map((t) => {
                    const isActive = t.tenant.id === currentTenantId;
                    return (
                      <DropdownMenuItem
                        key={t.tenant.id}
                        onClick={() => handleTenantSwitch(t.tenant.id)}
                        className={`
                          flex items-center gap-2.5 cursor-pointer rounded px-2 py-2.5
                          transition-all duration-200
                          ${isActive 
                            ? 'bg-primary/5 border border-primary/20' 
                            : 'border border-transparent hover:bg-muted/50 hover:border-border/40'
                          }
                        `}
                      >
                        <div className={`
                          flex items-center justify-center h-7 w-7 rounded 
                          transition-all duration-200 flex-shrink-0
                          ${isActive 
                            ? 'bg-primary/15 border border-primary/30' 
                            : 'bg-muted/50 border border-border/40'
                          }
                        `}>
                          <Building2 className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground/60'}`} />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : ''}`}>
                              {t.tenant.name}
                            </span>
                            {isActive && (
                              <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground/60 truncate">
                              {t.tenant.slug}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40">•</span>
                            <span className={`
                              text-[10px] capitalize px-1.5 py-0.5 rounded
                              ${isActive 
                                ? 'bg-primary/10 text-primary font-medium' 
                                : 'bg-muted text-muted-foreground/70'
                              }
                            `}>
                              {t.role}
                            </span>
                          </div>
                        </div>
                        {isActive && (
                          <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground/60">
                  No workspaces found
                </div>
              )}
            </div>
            <div className="p-1.5 border-t bg-muted/20">
              <DropdownMenuItem
                onClick={() => router.push('/settings/tenant')}
                className="cursor-pointer rounded px-2 py-2 hover:bg-muted/50 transition-all"
              >
                <div className="flex items-center justify-center h-7 w-7 rounded bg-muted/50 border border-border/40">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground/60" />
                </div>
                <span className="text-sm">Create New Tenant</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
