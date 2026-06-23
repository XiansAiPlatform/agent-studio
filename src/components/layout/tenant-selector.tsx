'use client';

import { useCallback, useMemo, useState } from 'react';
import { Building2, Check, ChevronDown, Search } from 'lucide-react';
import Image from 'next/image';
import { useTenant } from '@/hooks/use-tenant';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Above this many tenants, show a search box so large tenant lists stay usable.
const SEARCH_THRESHOLD = 8;

export function TenantSelector() {
  const { tenants, currentTenant, switchTenant } = useTenant();
  const [query, setQuery] = useState('');

  const showSearch = tenants.length > SEARCH_THRESHOLD;

  // Radix focuses the menu content on open; take focus to the search input on
  // the next frame so the user can type immediately.
  const focusSearch = useCallback((node: HTMLInputElement | null) => {
    if (node) requestAnimationFrame(() => node.focus());
  }, []);

  const filteredTenants = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      ({ tenant: t }) =>
        t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    );
  }, [tenants, query]);

  // If no current tenant, return null (logo shows in header)
  if (!currentTenant) {
    return null;
  }

  const { tenant } = currentTenant;

  // If only one tenant, don't show selector
  if (tenants.length === 1) {
    return null;
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setQuery('');
      }}
    >
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
      <DropdownMenuContent align="end" className="w-64 p-0">
        {showSearch && (
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={focusSearch}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tenants…"
                className="h-8 pl-8 text-sm"
                // Stop Radix's menu typeahead from hijacking keystrokes, but let
                // Escape bubble so the dropdown can still close.
                onKeyDown={(e) => {
                  if (e.key !== 'Escape') e.stopPropagation();
                }}
              />
            </div>
          </div>
        )}

        <div className="max-h-72 overflow-y-auto p-1">
          {filteredTenants.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No tenants found
            </div>
          ) : (
            filteredTenants.map(({ tenant: t }) => {
              const isActive = t.id === tenant.id;
              const tLogo = t.metadata?.logo;
              const tLogoSrc = tLogo?.imgBase64
                ? `data:image/png;base64,${tLogo.imgBase64}`
                : tLogo?.url;

              return (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => switchTenant(t.id)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="flex items-center justify-center h-6 w-6 rounded overflow-hidden bg-muted shrink-0">
                    {tLogoSrc ? (
                      <Image
                        src={tLogoSrc}
                        alt={t.name}
                        width={tLogo?.width || 24}
                        height={tLogo?.height || 24}
                        className="object-contain h-full w-full"
                        unoptimized
                      />
                    ) : (
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <span className="flex-1 truncate text-sm">{t.name}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
