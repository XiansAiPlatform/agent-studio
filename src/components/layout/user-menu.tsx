'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, Building2, ShieldCheck } from 'lucide-react';
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
import { useTenant } from '@/hooks/use-tenant';

export function UserMenu() {
  const { data: session, status } = useSession();
  const { currentTenant } = useTenant();

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
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled>
        <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
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

      <DropdownMenuContent align="end" className="w-56">
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
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Current Tenant</p>
                  <p className="text-sm font-medium truncate">{currentTenant.tenant.name}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
