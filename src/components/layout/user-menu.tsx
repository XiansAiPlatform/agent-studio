'use client';

import { useState } from 'react';
import { Check, ChevronDown, Building2, LogOut, Search } from 'lucide-react';
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

// Mock user data - replace with actual user data from your auth system
const mockUser = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: '', // Empty string will show fallback
  initials: 'JD',
};

// Mock tenant data - replace with actual tenant data from your backend
const mockTenants = [
  { id: '1', name: 'Acme Corporation', role: 'Admin' },
  { id: '2', name: 'TechStart Inc', role: 'Member' },
  { id: '3', name: 'Global Enterprises', role: 'Admin' },
  { id: '4', name: 'Innovation Labs', role: 'Member' },
  { id: '5', name: 'Digital Solutions Co', role: 'Admin' },
  { id: '6', name: 'Cloud Services Ltd', role: 'Member' },
  { id: '7', name: 'Software Ventures', role: 'Admin' },
  { id: '8', name: 'Data Analytics Inc', role: 'Member' },
];

export function UserMenu() {
  const [selectedTenant, setSelectedTenant] = useState(mockTenants[0].id);
  const [tenantSearch, setTenantSearch] = useState('');

  const handleTenantSwitch = (tenantId: string) => {
    setSelectedTenant(tenantId);
    setTenantSearch(''); // Reset search after selection
    // TODO: Implement actual tenant switching logic
    console.log('Switching to tenant:', tenantId);
  };

  const handleLogout = () => {
    // TODO: Implement actual logout logic
    console.log('Logging out...');
  };

  const currentTenant = mockTenants.find((t) => t.id === selectedTenant);

  // Filter tenants based on search
  const filteredTenants = mockTenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 gap-2 px-2 transition-all hover:bg-primary/10"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {mockUser.initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm hidden sm:inline-block max-w-[100px] truncate">
            {mockUser.name}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="end" forceMount>
        {/* User Info */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{mockUser.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {mockUser.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Current Tenant */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Current Workspace
        </DropdownMenuLabel>
        <div className="px-2 py-1.5 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">{currentTenant?.name}</span>
              <span className="text-xs text-muted-foreground">
                {currentTenant?.role}
              </span>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Tenant Switching with Search */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Building2 className="h-4 w-4" />
            <span>Switch Workspace</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 p-0">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search workspaces..."
                  className="pl-8 h-8"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1">
              {filteredTenants.length > 0 ? (
                filteredTenants.map((tenant) => (
                  <DropdownMenuItem
                    key={tenant.id}
                    onClick={() => handleTenantSwitch(tenant.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{tenant.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {tenant.role}
                        </span>
                      </div>
                      {tenant.id === selectedTenant && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No workspaces found
                </div>
              )}
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
