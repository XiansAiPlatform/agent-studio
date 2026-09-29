'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Eye, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VIEW_AS_PARTICIPANT_QUERY_PARAM } from '@/lib/messaging/view-as-constants';

interface TenantUserOption {
  email: string;
  name: string;
}

function parseTenantUserOptions(
  data: unknown,
  sessionEmail: string | null | undefined
): TenantUserOption[] {
  if (!data || typeof data !== 'object' || !('users' in data)) return [];
  const users = (data as { users?: unknown }).users;
  if (!Array.isArray(users)) return [];
  const self = sessionEmail?.trim().toLowerCase();
  const parsed: TenantUserOption[] = [];
  for (const entry of users) {
    if (!entry || typeof entry !== 'object') continue;
    const email =
      'email' in entry && typeof entry.email === 'string' ? entry.email.trim() : '';
    if (!email) continue;
    if (self && email.toLowerCase() === self) continue;
    if (!('name' in entry) || typeof entry.name !== 'string') continue;
    parsed.push({ email, name: entry.name });
  }
  return parsed;
}

export const USER_SEARCH_DEBOUNCE_MS = 300;
export const USER_SEARCH_TIMEOUT_MS = 8000;

interface ViewAsParticipantBarProps {
  tenantId: string | null;
  currentViewAsEmail: string | null;
  sessionEmail: string | null | undefined;
  onViewAsChange: (email: string | null) => void;
}

/**
 * System-admin control to view another tenant member's conversations (read-only).
 *
 * The confirm dialog is a UX acknowledgment only. It is not a server-side
 * consent token. Authorization is system-admin + tenant membership + audit
 * on the history/topics routes, including when viewAsParticipantId is already
 * in the URL (bookmark, shared link, or refresh).
 */
export function ViewAsParticipantBar({
  tenantId,
  currentViewAsEmail,
  sessionEmail,
  onViewAsChange,
}: ViewAsParticipantBarProps) {
  const [users, setUsers] = useState<TenantUserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingViewAsEmail, setPendingViewAsEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, USER_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    if (!tenantId) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, USER_SEARCH_TIMEOUT_MS);

    setIsLoadingUsers(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        tenantId,
        page: '1',
        pageSize: '100',
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const res = await fetch(`/api/system-admin/users?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error('Failed to load tenant users');
      }
      const data: unknown = await res.json();
      if (controller.signal.aborted) return;
      setUsers(parseTenantUserOptions(data, sessionEmail));
    } catch (e) {
      if (timedOut) {
        setLoadError('Timed out loading tenant users');
        setUsers([]);
        return;
      }
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (e instanceof Error && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setLoadError(e instanceof Error ? e.message : 'Failed to load users');
      setUsers([]);
    } finally {
      window.clearTimeout(timeoutId);
      if (controller.signal.aborted && !timedOut) {
        return;
      }
      setIsLoadingUsers(false);
    }
  }, [tenantId, debouncedSearch, sessionEmail]);

  useEffect(() => {
    if (!menuOpen) return;
    void fetchUsers();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchUsers, menuOpen]);

  const isViewingOther = !!currentViewAsEmail;

  const handleSelectChange = (value: string) => {
    if (value === '__self__') {
      setPendingViewAsEmail(null);
      onViewAsChange(null);
      return;
    }
    if (
      currentViewAsEmail &&
      value.trim().toLowerCase() === currentViewAsEmail.trim().toLowerCase()
    ) {
      return;
    }
    setPendingViewAsEmail(value);
  };

  const handleConfirmViewAs = () => {
    if (!pendingViewAsEmail) return;
    onViewAsChange(pendingViewAsEmail);
    setPendingViewAsEmail(null);
  };

  const handleCancelViewAs = () => {
    setPendingViewAsEmail(null);
  };

  const trimmedSearch = debouncedSearch.trim();
  const showNoMatches =
    menuOpen && !isLoadingUsers && !loadError && !!trimmedSearch && users.length === 0;

  return (
    <div
      className={
        isViewingOther
          ? 'shrink-0 border-b border-border/60 bg-muted/30 px-4 py-3 space-y-3'
          : 'shrink-0 border-b border-border/40 px-3 py-1'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <DropdownMenu
          modal={false}
          open={menuOpen}
          onOpenChange={(open) => {
            setMenuOpen(open)
            if (open) {
              window.setTimeout(() => searchInputRef.current?.focus(), 0)
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!tenantId}
              title="View another user's conversations"
              className="h-7 max-w-full px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
            >
              <Eye className="opacity-70" aria-hidden />
              <span className="truncate">
                {isViewingOther ? `Viewing as ${currentViewAsEmail}` : 'View as'}
              </span>
              <ChevronDown className="opacity-60" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 p-2">
            <div
              onKeyDown={(event) => {
                if (event.key !== 'Escape') event.stopPropagation();
              }}
            >
              <Label htmlFor="view-as-user-search" className="sr-only">
                Search tenant users
              </Label>
              <Input
                ref={searchInputRef}
                id="view-as-user-search"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            {isLoadingUsers && (
              <p className="px-2 pt-2 text-xs text-muted-foreground">Searching…</p>
            )}
            {loadError && (
              <p className="px-2 pt-2 text-xs text-destructive" role="status">
                {loadError}
              </p>
            )}
            <div className="mt-1 max-h-60 overflow-y-auto">
              <DropdownMenuItem onSelect={() => handleSelectChange('__self__')}>
                Your conversations
              </DropdownMenuItem>
              {users.map((user) => (
                <DropdownMenuItem
                  key={user.email}
                  onSelect={() => handleSelectChange(user.email)}
                >
                  {user.name ? `${user.name} (${user.email})` : user.email}
                </DropdownMenuItem>
              ))}
            </div>
            {showNoMatches && (
              <p className="px-2 py-2 text-xs text-muted-foreground">No matching users</p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {isViewingOther && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs font-normal"
            onClick={() => onViewAsChange(null)}
          >
            <X aria-hidden />
            Exit view-as
          </Button>
        )}
      </div>

      {isViewingOther && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            Privacy: viewing another user&apos;s conversations
          </AlertTitle>
          <AlertDescription className="text-sm text-amber-950/90 dark:text-amber-50/90">
            You are viewing private messages for{' '}
            <strong>{currentViewAsEmail}</strong>. This mode is read-only. Your
            access is logged for audit (
            <code className="text-xs">{VIEW_AS_PARTICIPANT_QUERY_PARAM}</code>).
          </AlertDescription>
        </Alert>
      )}

      <AlertDialog
        open={!!pendingViewAsEmail}
        onOpenChange={(open) => {
          if (!open) handleCancelViewAs();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              View another user&apos;s conversations?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This access will be recorded in the audit log. Get consent from{' '}
              <strong>{pendingViewAsEmail}</strong> before you continue. The
              view is read-only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelViewAs}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmViewAs}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
