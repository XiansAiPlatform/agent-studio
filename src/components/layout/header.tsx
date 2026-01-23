'use client';

import { Bell, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { TenantSelector } from './tenant-selector';
import { Input } from '@/components/ui/input';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-3 px-6">
        {/* Branding */}
        <Link href="/" className="flex flex-col gap-0.5 hover:opacity-80 transition-opacity group">
          <Image 
            src="/logo.svg" 
            alt="Xians" 
            width={90} 
            height={40}
            className="h-7 w-auto"
            priority
          />
          <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors tracking-wide">
            Agent Studio
          </span>
        </Link>

        {/* Divider */}
        <div className="hidden md:block h-6 w-px bg-border/60" />

        {/* Tenant Selector */}
        <div className="hidden md:block">
          <TenantSelector />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Global Search */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search... (⌘K)"
              className="pl-8 h-9"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 transition-all hover:bg-primary/10 hover:text-primary group">
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 group-hover:scale-110" />
            <span className="sr-only">Quick actions</span>
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 relative transition-all hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 group">
            <Bell className="h-4 w-4 transition-transform group-hover:rotate-12 group-hover:scale-110" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <span className="sr-only">Notifications</span>
          </Button>

          <ThemeToggle />

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
