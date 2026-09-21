'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Eye, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { VIEW_AS_PARTICIPANT_QUERY_PARAM } from '@/lib/messaging/view-as-constants';

interface TenantUserOption {
  email: string;
  name: string;
}

interface ViewAsParticipantBarProps {
  tenantId: string | null;
  currentViewAsEmail: string | null;
  sessionEmail: string | null | undefined;
  onViewAsChange: (email: string | null) => void;
}

/**
 * System-admin control to view another tenant member's conversations (read-only).
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!tenantId) return;
    setIsLoadingUsers(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        tenantId,
        page: '1',
        pageSize: '100',
      });
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/system-admin/users?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load tenant users');
      }
      const data = (await res.json()) as { users?: TenantUserOption[] };
      const list = (data.users ?? []).filter(
        (u) =>
          u.email &&
          u.email.trim().toLowerCase() !== sessionEmail?.trim().toLowerCase()
      );
      setUsers(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load users');
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [tenantId, search, sessionEmail]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const isViewingOther = !!currentViewAsEmail;

  return (
    <div className="shrink-0 border-b border-border/60 bg-muted/30 px-4 py-3 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground shrink-0">
            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
            View conversations as
          </div>
          <div className="flex flex-col gap-1.5 min-w-0 flex-1 max-w-md">
            <Label htmlFor="view-as-user-search" className="sr-only">
              Search tenant users
            </Label>
            <Input
              id="view-as-user-search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <Select
            value={currentViewAsEmail ?? '__self__'}
            onValueChange={(value) => {
              onViewAsChange(value === '__self__' ? null : value);
            }}
            disabled={!tenantId || isLoadingUsers}
          >
            <SelectTrigger className="h-9 w-full sm:w-[280px]">
              <SelectValue
                placeholder={isLoadingUsers ? 'Loading users…' : 'Your conversations'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__self__">Your conversations</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.email} value={user.email}>
                  {user.name ? `${user.name} (${user.email})` : user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isViewingOther && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => onViewAsChange(null)}
          >
            <X className="h-4 w-4 mr-1.5" aria-hidden />
            Exit view-as
          </Button>
        )}
      </div>

      {loadError && (
        <p className="text-xs text-destructive" role="status">
          {loadError}
        </p>
      )}

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
    </div>
  );
}
