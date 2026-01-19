'use client';

import { Building2, Check, ChevronDown, Sparkles } from 'lucide-react';
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

  // If no current tenant, show a minimal loading state
  if (!currentTenant) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/30 border border-border/40">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-xs text-muted-foreground/60">Loading...</span>
      </div>
    );
  }

  const { tenant, role } = currentTenant;

  // If only one tenant, show a subtle non-interactive display
  if (tenants.length === 1) {
    return (
      <div className="group flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/30 border border-border/40 transition-all hover:bg-muted/50">
        <div className="flex items-center justify-center h-6 w-6 rounded bg-primary/10 border border-primary/20 group-hover:border-primary/30 transition-colors">
          <Building2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium leading-tight">{tenant.name}</span>
          <span className="text-[10px] text-muted-foreground/70 capitalize leading-tight">
            {role}
          </span>
        </div>
      </div>
    );
  }

  // If multiple tenants, show an elegant dropdown selector
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="group flex items-center gap-2 h-auto py-1.5 px-2.5 hover:bg-muted/50 border border-transparent hover:border-border/40 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-center h-6 w-6 rounded bg-primary/10 border border-primary/20 group-hover:border-primary/30 transition-colors">
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-medium leading-tight">{tenant.name}</span>
            <span className="text-[10px] text-muted-foreground/70 capitalize leading-tight">
              {role}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground/50 ml-0.5 transition-transform group-hover:text-muted-foreground group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1.5">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-2 py-1.5">
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        <div className="space-y-0.5">
          {tenants.map(({ tenant: t, role: r }) => {
            const isActive = t.id === tenant.id;
            return (
              <DropdownMenuItem
                key={t.id}
                onClick={() => switchTenant(t.id)}
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
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-primary/15 border border-primary/30' 
                    : 'bg-muted/50 border border-border/40 group-hover:bg-muted'
                  }
                `}>
                  <Building2 className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground/60'}`} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : ''}`}>
                      {t.name}
                    </span>
                    {isActive && (
                      <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground/60 truncate">
                      {t.slug}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">•</span>
                    <span className={`
                      text-[10px] capitalize px-1.5 py-0.5 rounded
                      ${isActive 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'bg-muted text-muted-foreground/70'
                      }
                    `}>
                      {r}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
