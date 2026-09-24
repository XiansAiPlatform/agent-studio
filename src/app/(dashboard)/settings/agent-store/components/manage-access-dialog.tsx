'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Trash2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import type { AgentAccess, AgentAccessLevel } from '@/lib/xians/types';

const LEVELS: AgentAccessLevel[] = ['Read', 'Write', 'Owner'];

interface DirectoryUser {
  userId: string;
  name?: string;
  email?: string;
  roles?: string[];
  isSysAdmin?: boolean;
  resolvedAdmin?: boolean;
}

/**
 * TenantAdmin / SysAdmin always bypass the per-agent access lists.
 */
function isAdminUser(u: DirectoryUser | undefined | null): boolean {
  if (!u) return false;
  return u.isSysAdmin === true || u.resolvedAdmin === true || (u.roles ?? []).includes('TenantAdmin');
}

/**
 * Participant Admin / Developer get write-level access when no explicit grant exists.
 */
function isAgentOperatorUser(u: DirectoryUser | undefined | null): boolean {
  if (!u || isAdminUser(u)) return false;
  const roles = u.roles ?? [];
  return roles.includes('TenantParticipantAdmin') || roles.includes('TenantUser');
}

interface AccessRow {
  userId: string;
  level: AgentAccessLevel;
  /**
   * No explicit grant on this agent — level is implied
   * (admin → Owner, or role-default / undefined → Write).
   */
  virtual?: boolean;
  implicitKind?: 'admin' | 'role-default';
}

interface ManageAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: { id: string; name: string } | null;
}

function toRows(access: AgentAccess): AccessRow[] {
  // Highest level wins if an id somehow appears in more than one list.
  const byId = new Map<string, AgentAccessLevel>();
  for (const id of access.readAccess ?? []) byId.set(id, 'Read');
  for (const id of access.writeAccess ?? []) byId.set(id, 'Write');
  for (const id of access.ownerAccess ?? []) byId.set(id, 'Owner');
  return [...byId.entries()]
    .map(([userId, level]) => ({ userId, level }))
    .sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level));
}

export function ManageAccessDialog({ open, onOpenChange, agent }: ManageAccessDialogProps) {
  const [access, setAccess] = useState<AgentAccess | null>(null);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  
  const [resolvedExtras, setResolvedExtras] = useState<Record<string, DirectoryUser>>({});
  const [canListUsers, setCanListUsers] = useState(true);

  const agentId = agent?.id ?? null;
  // Loading is derived: the loaded access object carries its own agentId, so it
  // is only "ready" once that matches the agent the dialog is currently for.
  const isReady = !!access && !!agentId && access.agentId === agentId;

  // Listed userIds we've already tried a per-user admin-status lookup for (see
  // the resolution effect below), so a re-render doesn't re-fetch the same id.
  const attemptedResolveRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !agentId) return;
  
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/agent-deployments/${encodeURIComponent(agentId)}/access`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          throw Object.assign(new Error(data.error || data.message || 'Failed to load access'), {
            status: res.status,
          });
        }
        setAccess(data as AgentAccess);
      } catch (err) {
        if (cancelled) return;
        showErrorToast(err, 'Failed to load access');
        onOpenChange(false);
      }
    })();

    (async () => {
      // Directory of tenant users for the picker + display names. Only tenant
      // admins can list users; owners who aren't fall back to a raw id field.
      try {
        const res = await fetch('/api/settings/users?page=1&pageSize=200');
        if (cancelled) return;
        if (res.status === 403) {
          setCanListUsers(false);
          setDirectory([]);
          return;
        }
        const data = (await res.json()) as {
          users?: Array<{
            userId?: string;
            user_id?: string;
            name?: string;
            email?: string;
            roles?: string[];
            isSysAdmin?: boolean;
            is_sys_admin?: boolean;
          }>;
        };
        if (cancelled) return;
        if (res.ok && Array.isArray(data.users)) {
          setCanListUsers(true);
          setDirectory(
            data.users.map((u) => ({
              userId: u.userId ?? u.user_id ?? '',
              name: u.name,
              email: u.email,
              roles: u.roles,
              isSysAdmin: u.isSysAdmin ?? u.is_sys_admin,
            }))
          );
        }
      } catch {
        if (!cancelled) setCanListUsers(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, agentId, onOpenChange]);

  const rows = useMemo(() => (access && isReady ? toRows(access) : []), [access, isReady]);
  
  const ownerCount = rows.filter((r) => r.level === 'Owner').length;

  const directoryById = useMemo(() => {
    const map = new Map<string, DirectoryUser>();
    
    for (const u of directory) if (u.userId) map.set(u.userId, u);
    for (const u of Object.values(resolvedExtras)) if (u.userId) map.set(u.userId, u);
    return map;
  }, [directory, resolvedExtras]);


  useEffect(() => {
    if (!open || !agentId || rows.length === 0) return;

    const missing = rows
      .map((r) => r.userId)
      .filter((id) => id && !directoryById.has(id) && !attemptedResolveRef.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => attemptedResolveRef.current.add(id));

    let cancelled = false;
    (async () => {
      const resolved = await Promise.all(
        missing.map(async (id): Promise<DirectoryUser | null> => {
          try {
            const res = await fetch(`/api/agent-access?userId=${encodeURIComponent(id)}`);
            if (!res.ok) return null;
            const data = (await res.json()) as { canEditAll?: boolean };
            return data.canEditAll ? { userId: id, resolvedAdmin: true } : null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      const additions = resolved.filter((u): u is DirectoryUser => !!u);
      if (additions.length > 0) {
        setResolvedExtras((prev) => {
          const next = { ...prev };
          for (const u of additions) next[u.userId] = u;
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, agentId, rows, directoryById]);

  // Every tenant member appears here. Explicit grants win; otherwise:
  // TenantAdmin/SysAdmin → Owner, no grant → Write (role default / undefined).
  const displayRows = useMemo(() => {
    const explicitById = new Map(rows.map((r) => [r.userId, r.level] as const));
    const byId = new Map<string, AccessRow>();

    for (const u of directory) {
      if (!u.userId) continue;
      if (isAdminUser(u)) {
        byId.set(u.userId, {
          userId: u.userId,
          level: 'Owner',
          virtual: !explicitById.has(u.userId),
          implicitKind: 'admin',
        });
        continue;
      }
      const explicit = explicitById.get(u.userId);
      if (explicit) {
        byId.set(u.userId, { userId: u.userId, level: explicit });
        continue;
      }
      byId.set(u.userId, {
        userId: u.userId,
        level: 'Write',
        virtual: true,
        implicitKind: 'role-default',
      });
    }

    // Grants for users not in the directory (e.g. removed members) still show.
    for (const r of rows) {
      if (byId.has(r.userId)) continue;
      const admin = isAdminUser(directoryById.get(r.userId));
      byId.set(r.userId, {
        userId: r.userId,
        level: admin ? 'Owner' : r.level,
        virtual: admin,
        implicitKind: admin ? 'admin' : undefined,
      });
    }

    return [...byId.values()].sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level));
  }, [rows, directory, directoryById]);

  const displayName = useCallback(
    (userId: string) => {
      const match = directoryById.get(userId);
      if (match) return match.name || match.email || userId;
      return userId;
    },
    [directoryById]
  );

  const applyResult = (updated: AgentAccess) => setAccess(updated);

  const handleChangeLevel = async (userId: string, level: AgentAccessLevel) => {
    if (!agentId || isAdminUser(directoryById.get(userId))) return;
    const currentRow = rows.find((r) => r.userId === userId);
    const displayRow = displayRows.find((r) => r.userId === userId);
    // Already at this level (explicit or implied Write default).
    if (currentRow?.level === level) return;
    if (!currentRow && displayRow?.virtual && displayRow.level === level) return;
    if (currentRow?.level === 'Owner' && level !== 'Owner' && ownerCount <= 1) {
      showErrorToast(new Error('An agent must keep at least one owner.'));
      return;
    }
    setPendingUser(userId);
    try {
      // No explicit grant yet — create one (turns an implied Write into a real grant).
      if (!currentRow) {
        const res = await fetch(`/api/agent-deployments/${encodeURIComponent(agentId)}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, level }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Failed to update access');
        applyResult(data as AgentAccess);
        showSuccessToast('Access updated', `${displayName(userId)} is now ${level}`);
        return;
      }

      const res = await fetch(
        `/api/agent-deployments/${encodeURIComponent(agentId)}/access/users/${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to update access');
      applyResult(data as AgentAccess);
      showSuccessToast('Access updated', `${displayName(userId)} is now ${level}`);
    } catch (err) {
      showErrorToast(err);
    } finally {
      setPendingUser(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!agentId || isAdminUser(directoryById.get(userId))) return;
    const currentRow = rows.find((r) => r.userId === userId);
    // Implied defaults are not stored — nothing to remove.
    if (!currentRow) return;
    if (currentRow.level === 'Owner' && ownerCount <= 1) {
      showErrorToast(new Error('An agent must keep at least one owner.'));
      return;
    }
    setPendingUser(userId);
    try {
      const res = await fetch(
        `/api/agent-deployments/${encodeURIComponent(agentId)}/access/users/${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to remove access');
      applyResult(data as AgentAccess);
      showSuccessToast('Access removed', `${displayName(userId)} returned to the default Write level`);
    } catch (err) {
      showErrorToast(err);
    } finally {
      setPendingUser(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[min(90dvh,40rem)] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="min-w-0 pr-6">
          <DialogTitle className="flex items-center gap-2 min-w-0">
            <Users className="h-4 w-4 shrink-0" />
            <span className="truncate">
              Manage access{agent ? ` — ${agent.name}` : ''}
            </span>
          </DialogTitle>
          <DialogDescription>
            All tenant members are listed. Explicit grants override the default;
            when none is set, access shows as Write (role default for Participant
            Admins and Developers). Tenant and system administrators always have
            full Owner access.
          </DialogDescription>
        </DialogHeader>

        {!isReady || !access ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 min-w-0">
            {/* Current access list */}
            <div className="rounded-lg border divide-y min-w-0 overflow-hidden">
              {displayRows.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                  {canListUsers
                    ? 'No users in this tenant yet.'
                    : 'No access entries yet. Ask a tenant administrator to list users.'}
                </p>
              ) : (
                displayRows.map((row) => {
                  const isCreator = row.userId === access.createdBy;
                  const busy = pendingUser === row.userId;
                  const rowUser = directoryById.get(row.userId);
                  const rowIsAdmin = isAdminUser(rowUser);
                  const isVirtual = !!row.virtual;
                  return (
                    <div
                      key={row.userId}
                      className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{displayName(row.userId)}</p>
                        {(isCreator || rowIsAdmin || isVirtual) && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {isCreator && (
                              <span className="shrink-0 text-[10px] font-normal text-muted-foreground border rounded px-1 py-0.5">
                                creator
                              </span>
                            )}
                            {rowIsAdmin && (
                              <span
                                className="shrink-0 text-[10px] font-normal text-muted-foreground border rounded px-1 py-0.5"
                                title="Admin — always full access"
                              >
                                {row.virtual ? 'admin (implicit)' : 'admin'}
                              </span>
                            )}
                            {!rowIsAdmin && row.implicitKind === 'role-default' && (
                              <span
                                className="shrink-0 text-[10px] font-normal text-muted-foreground border rounded px-1 py-0.5"
                                title={
                                  isAgentOperatorUser(rowUser)
                                    ? 'No explicit grant — Write by role default'
                                    : 'No explicit grant — shown as Write'
                                }
                              >
                                default
                              </span>
                            )}
                          </div>
                        )}
                        {displayName(row.userId) !== row.userId && (
                          <p className="text-xs text-muted-foreground truncate">{row.userId}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <Select
                          value={row.level}
                          onValueChange={(v) => handleChangeLevel(row.userId, v as AgentAccessLevel)}
                          disabled={busy || rowIsAdmin}
                        >
                          <SelectTrigger className="w-[110px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEVELS.map((lvl) => (
                              <SelectItem key={lvl} value={lvl}>
                                {lvl}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(row.userId)}
                          disabled={busy || rowIsAdmin || isVirtual}
                          aria-label={`Remove ${displayName(row.userId)}`}
                          title={
                            isVirtual
                              ? 'Default access is not stored — change the level to set an explicit grant'
                              : undefined
                          }
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
