'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Trash2, ShieldCheck, Users, CheckCircle2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import type { AgentAccess, AgentAccessLevel } from '@/lib/xians/types';

const LEVELS: AgentAccessLevel[] = ['Read', 'Write', 'Owner'];

const LEVEL_HELP: Record<AgentAccessLevel, string> = {
  Read: 'Can see and use the agent',
  Write: 'Can also edit the agent, its knowledge and schedules',
  Owner: 'Full control, including managing access',
};

interface DirectoryUser {
  userId: string;
  name?: string;
  email?: string;
  roles?: string[];
  isSysAdmin?: boolean;
  resolvedAdmin?: boolean;
}

/**
 * TenantAdmin / SysAdmin always bypass the per-agent access lists
 */
function isAdminUser(u: DirectoryUser | undefined | null): boolean {
  if (!u) return false;
  return u.isSysAdmin === true || u.resolvedAdmin === true || (u.roles ?? []).includes('TenantAdmin');
}

interface AccessRow {
  userId: string;
  level: AgentAccessLevel;
  /** True for a TenantAdmin/SysAdmin shown by default with no explicit grant on this agent. */
  virtual?: boolean;
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

  const [newUserId, setNewUserId] = useState('');
  const [newLevel, setNewLevel] = useState<AgentAccessLevel>('Read');
  const [isAdding, setIsAdding] = useState(false);

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

  // Every current TenantAdmin/SysAdmin in the tenant already has full access to
  // every agent regardless of any list 
  const displayRows = useMemo(() => {
    const byId = new Map<string, AccessRow>();
    for (const r of rows) {
      const admin = isAdminUser(directoryById.get(r.userId));
      byId.set(r.userId, { userId: r.userId, level: admin ? 'Owner' : r.level });
    }
    for (const u of directory) {
      if (u.userId && isAdminUser(u) && !byId.has(u.userId)) {
        byId.set(u.userId, { userId: u.userId, level: 'Owner', virtual: true });
      }
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

  const listedIds = useMemo(() => new Set(displayRows.map((r) => r.userId)), [displayRows]);
  const addableUsers = useMemo(
    () => directory.filter((u) => u.userId && !listedIds.has(u.userId)),
    [directory, listedIds]
  );

  const applyResult = (updated: AgentAccess) => setAccess(updated);

  const handleChangeLevel = async (userId: string, level: AgentAccessLevel) => {
    if (!agentId || isAdminUser(directoryById.get(userId))) return;
    const currentRow = rows.find((r) => r.userId === userId);
    if (currentRow?.level === level) return;
    if (currentRow?.level === 'Owner' && level !== 'Owner' && ownerCount <= 1) {
      showErrorToast(new Error('An agent must keep at least one owner.'));
      return;
    }
    setPendingUser(userId);
    try {
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
    if (currentRow?.level === 'Owner' && ownerCount <= 1) {
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
      showSuccessToast('Access removed', `${displayName(userId)} can no longer access this agent`);
    } catch (err) {
      showErrorToast(err);
    } finally {
      setPendingUser(null);
    }
  };

  const handleAdd = async () => {
    if (!agentId) return;
    const userId = newUserId.trim();
    if (!userId) {
      showErrorToast(new Error('Pick a user to add.'));
      return;
    }
    if (userId.includes('@')) {
      showErrorToast(new Error('Enter a user id, not an email address.'));
      return;
    }
    if (isAdminUser(directoryById.get(userId))) {
      showErrorToast(
        new Error('Tenant/System admins already have full access and always bypass this list.')
      );
      return;
    }
    setIsAdding(true);
    try {
      const res = await fetch(`/api/agent-deployments/${encodeURIComponent(agentId)}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, level: newLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to add user');
      applyResult(data as AgentAccess);
      setNewUserId('');
      setNewLevel('Read');
      showSuccessToast('Access granted', `${displayName(userId)} is now ${newLevel}`);
    } catch (err) {
      showErrorToast(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage access{agent ? ` — ${agent.name}` : ''}
          </DialogTitle>
          <DialogDescription>
            Choose who can access this agent and at what level. Tenant and system
            administrators always have full access.
          </DialogDescription>
        </DialogHeader>

        {!isReady || !access ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current access list */}
            <div className="rounded-lg border divide-y">
              {displayRows.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                  No explicit access yet.
                </p>
              ) : (
                displayRows.map((row) => {
                  const isCreator = row.userId === access.createdBy;
                  const busy = pendingUser === row.userId;
                  const rowIsAdmin = isAdminUser(directoryById.get(row.userId));
                  return (
                    <div key={row.userId} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate flex items-center gap-1.5">
                          {displayName(row.userId)}
                          {isCreator && (
                            <span className="text-[10px] font-normal text-muted-foreground border rounded px-1 py-0.5">
                              creator
                            </span>
                          )}
                          {rowIsAdmin && (
                            <span className="text-[10px] font-normal text-muted-foreground border rounded px-1 py-0.5">
                              admin — always full access{row.virtual ? ', not explicitly granted' : ''}
                            </span>
                          )}
                        </p>
                        {displayName(row.userId) !== row.userId && (
                          <p className="text-xs text-muted-foreground truncate">{row.userId}</p>
                        )}
                      </div>
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
                        disabled={busy || rowIsAdmin}
                        aria-label={`Remove ${displayName(row.userId)}`}
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add a user */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Add a user</Label>
              <div className="flex items-center gap-2">
                {canListUsers ? (
                  <Select value={newUserId} onValueChange={setNewUserId} disabled={isAdding}>
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue placeholder="Select a user…" />
                    </SelectTrigger>
                    <SelectContent>
                      {addableUsers.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          Everyone is already listed
                        </div>
                      ) : (
                        addableUsers.map((u) => {
                          const admin = isAdminUser(u);
                          return (
                            <SelectItem key={u.userId} value={u.userId} disabled={admin}>
                              <span className="flex items-center gap-1.5">
                                {u.name || u.email || u.userId}
                                {admin && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <CheckCircle2 className="h-3 w-3" />
                                    admin — already has full access
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="flex-1 h-9"
                    placeholder="User id"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    disabled={isAdding}
                  />
                )}
                <Select
                  value={newLevel}
                  onValueChange={(v) => setNewLevel(v as AgentAccessLevel)}
                  disabled={isAdding}
                >
                  <SelectTrigger className="w-[110px] h-9">
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
                  onClick={handleAdd}
                  disabled={isAdding || !newUserId.trim() || isAdminUser(directoryById.get(newUserId))}
                  className="h-9"
                >
                  {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                {LEVEL_HELP[newLevel]}
              </p>
              {!canListUsers && (
                <p className="text-xs text-muted-foreground">
                  You can add users by id. Ask a tenant administrator if you need to look one up.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
