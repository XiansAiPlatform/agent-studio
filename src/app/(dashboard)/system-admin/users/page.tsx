'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-permissions';
import { RequireCapability } from '@/components/auth/can';
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Loader2,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenants } from '../tenants/hooks/use-tenants';
import { useUsers } from './hooks/use-users';
import {
  GlobalUser,
  TenantUser,
  NewUserFormData,
  TENANT_ROLES,
  roleLabel,
} from './types'
import { AddUserDialog } from './components/add-user-dialog';
import { DeleteUserDialog } from './components/delete-user-dialog';
import { UserDetailPanel } from './components/user-detail-panel';

const PAGE_SIZE = 20;
const ALL_TENANTS = '__all__';

function UsersPageContent() {
  const { isLoading: isAuthLoading } = useAuth();

  const [selectedTenantId, setSelectedTenantId] = useState<string>(ALL_TENANTS);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [detailTarget, setDetailTarget] = useState<GlobalUser | TenantUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { tenants, fetchTenants } = useTenants();
  const {
    users,
    totalCount,
    pageSize,
    isLoading,
    error,
    fetchGlobalUsers,
    fetchTenantUsers,
    createUser,
    setSysAdmin,
    setUserEnabled,
    deleteUser,
  } = useUsers()

  const isSystemAdmin = useCan('system:admin');

  useEffect(() => {
    if (isSystemAdmin) fetchTenants();
  }, [isSystemAdmin, fetchTenants]);

  // Debounce search input.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Reset page when filters change.
  useEffect(() => {
    setPage(1);
  }, [selectedTenantId, search, roleFilter]);

  // Reset the role filter when the tenant selection changes, since the set of
  // valid role options differs between global and tenant-scoped modes.
  useEffect(() => {
    setRoleFilter('all');
  }, [selectedTenantId]);

  const isAllTenants = selectedTenantId === ALL_TENANTS;

  const loadUsers = useMemo(
    () => () => {
      if (!isSystemAdmin) return;
      if (isAllTenants) {
        fetchGlobalUsers({
          page,
          pageSize: PAGE_SIZE,
          search: search || undefined,
          role: roleFilter === 'all' ? undefined : roleFilter,
        });
      } else {
        fetchTenantUsers({
          tenantId: selectedTenantId,
          page,
          pageSize: PAGE_SIZE,
          search: search || undefined,
          role: roleFilter === 'all' ? undefined : roleFilter,
        });
      }
    },
    [isSystemAdmin, isAllTenants, selectedTenantId, page, search, roleFilter,
     fetchGlobalUsers, fetchTenantUsers]
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const sortedTenants = useMemo(
    () =>
      [...tenants].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      ),
    [tenants]
  );

  const selectedTenant = sortedTenants.find((t) => t.tenantId === selectedTenantId);
  const tenantName = selectedTenant?.name;
  const totalPages = Math.max(1, Math.ceil(totalCount / (pageSize || PAGE_SIZE)));

  const handleAdd = async (data: NewUserFormData) => {
    const [first, ...rest] = data.memberships
    if (!first?.tenantId) return
    try {
      // Create the user via the first tenant membership.
      const created = await createUser(first.tenantId, {
        name: data.name,
        email: data.email,
        role: first.role,
      })

      // Add to any additional tenants (best-effort, report failures without rolling back).
      if (rest.length > 0) {
        const results = await Promise.allSettled(
          rest.map((m) =>
            createUser(m.tenantId, { name: data.name, email: data.email, role: m.role })
          )
        )
        const failed = results.filter((r) => r.status === 'rejected').length
        if (failed > 0) {
          toast.warning(`User created but failed to add to ${failed} additional tenant(s)`)
        }
      }

      // Apply optional account-level flags on the newly created user.
      if (data.isSysAdmin) await setSysAdmin(created.userId, true)
      if (!data.isEnabled) await setUserEnabled(created.userId, false)

      toast.success(`User "${data.name}" created`)
      loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
      throw err
    }
  }

  const handleDeleteConfirm = async () => {
    if (isAllTenants || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteUser(selectedTenantId, deleteTarget.userId);
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove user');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isAuthLoading || !isSystemAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage users, assign roles, and configure system admin access.
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          New User
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger>
              <SelectValue placeholder="All Tenants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TENANTS}>All Tenants</SelectItem>
              {sortedTenants.map((t) => (
                <SelectItem key={t.tenantId} value={t.tenantId}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 min-w-[12rem] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role filter: in All Tenants mode a System Admin option is also available */}
        <div className="w-44">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {isAllTenants && (
                <SelectItem value="SysAdmin">{roleLabel('SysAdmin')}</SelectItem>
              )}
              {TENANT_ROLES.map((role) => (
                <SelectItem key={role} value={role}>{roleLabel(role)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={loadUsers}
          disabled={isLoading}
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        {totalCount > 0 && (
          <span className="text-sm text-muted-foreground ml-auto">
            {totalCount} {totalCount === 1 ? 'user' : 'users'}
          </span>
        )}
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────── */}
      {isLoading && users.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-16 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading users…
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-16 text-center text-muted-foreground">
          <UsersIcon className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">No users found</p>
          <p className="text-xs mt-1">
            {search || roleFilter !== 'all'
              ? 'Try a different search or filter'
              : 'No users match the current selection'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">User</th>
                  {isAllTenants
                    ? <th className="px-4 py-3 font-medium">Tenants</th>
                    : <th className="px-4 py-3 font-medium">Role</th>}
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelected = detailTarget?.userId === u.userId;
                  const isTenantUser = 'roles' in u;
                  return (
                    <tr
                      key={u.userId}
                      className={`border-b last:border-0 transition-colors cursor-pointer ${
                        isSelected ? 'bg-accent/40' : 'hover:bg-accent/20'
                      }`}
                      onClick={() => setDetailTarget(u)}
                    >
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary shrink-0">
                            {u.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <span className="truncate">{u.name}</span>
                              {u.isSysAdmin && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 bg-primary/10 text-primary border-primary/20 shrink-0">
                                  <ShieldCheck className="h-2.5 w-2.5" />
                                  Sys Admin
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Tenants / Role */}
                      {isAllTenants ? (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-sm">
                              {'tenantCount' in u ? u.tenantCount : 0}{' '}
                              {'tenantCount' in u && u.tenantCount === 1 ? 'tenant' : 'tenants'}
                            </span>
                          </div>
                        </td>
                      ) : (
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {u.isSysAdmin
                              ? 'System Admin'
                              : isTenantUser
                                ? roleLabel((u as TenantUser).roles?.[0] ?? 'TenantParticipant')
                                : '—'}
                          </Badge>
                        </td>
                      )}

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge variant={u.isEnabled ? 'default' : 'secondary'}>
                          {u.isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions for {u.name}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(u as TenantUser)}
                              disabled={isAllTenants}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove from Tenant
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isAllTenants && (
        <p className="text-xs text-muted-foreground text-center">
          Showing all platform users. Select a specific tenant to add or remove users.
        </p>
      )}

      {/* ── Dialogs / panels ────────────────────────────────────── */}
      <AddUserDialog
        selectedTenantId={isAllTenants ? undefined : selectedTenantId}
        selectedTenantName={tenantName}
        tenants={sortedTenants}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAdd}
      />

      <UserDetailPanel
        user={detailTarget}
        open={detailTarget !== null}
        onOpenChange={(open) => { if (!open) setDetailTarget(null); }}
        onRefresh={loadUsers}
      />

      <DeleteUserDialog
        user={deleteTarget}
        tenantName={tenantName}
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequireCapability
      permission="system:admin"
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <UsersPageContent />
    </RequireCapability>
  );
}
