'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  TenantUser,
  CreateUserRequest,
  UpdateUserRequest,
  ALL_ROLES,
  TENANT_ROLES,
  Role,
  roleLabel,
  effectiveRole,
} from './types';
import { AddUserDialog } from './components/add-user-dialog';
import { EditUserDialog } from './components/edit-user-dialog';
import { DeleteUserDialog } from './components/delete-user-dialog';

const PAGE_SIZE = 20;

export default function UsersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<TenantUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const { tenants, fetchTenants } = useTenants();
  const {
    users,
    totalCount,
    pageSize,
    isLoading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    changeRole,
    setUserEnabled,
    deleteUser,
  } = useUsers();

  // Client-side UX guard. Real authorization is enforced server-side in the
  // API routes (withSystemAdmin) and middleware — this only avoids flashing the
  // page to non-admins.
  useEffect(() => {
    if (!isAuthLoading && user?.isSystemAdmin === false) {
      router.replace('/dashboard');
    }
  }, [isAuthLoading, user, router]);

  const isSystemAdmin = user?.isSystemAdmin === true;

  useEffect(() => {
    if (isSystemAdmin) {
      fetchTenants();
    }
  }, [isSystemAdmin, fetchTenants]);

  // Auto-select the first tenant once tenants load.
  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      const sorted = [...tenants].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      setSelectedTenantId(sorted[0].tenantId);
    }
  }, [tenants, selectedTenantId]);

  // Debounce the search input.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Reset to first page whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [selectedTenantId, search, roleFilter]);

  const loadUsers = useMemo(
    () => () => {
      if (!selectedTenantId) return;
      fetchUsers({
        tenantId: selectedTenantId,
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
      });
    },
    [selectedTenantId, page, search, roleFilter, fetchUsers]
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

  const selectedTenant = sortedTenants.find(
    (t) => t.tenantId === selectedTenantId
  );
  const tenantName = selectedTenant?.name;

  const totalPages = Math.max(1, Math.ceil(totalCount / (pageSize || PAGE_SIZE)));

  const handleAdd = async (data: CreateUserRequest) => {
    if (!selectedTenantId) return;
    try {
      await createUser(selectedTenantId, data);
      toast.success(`User “${data.name}” created`);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
      throw err;
    }
  };

  const handleEdit = async (userId: string, data: UpdateUserRequest) => {
    if (!selectedTenantId) return;
    if (Object.keys(data).length === 0) {
      return;
    }
    try {
      await updateUser(selectedTenantId, userId, data);
      toast.success('User updated');
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
      throw err;
    }
  };

  const handleRoleChange = async (target: TenantUser, role: Role) => {
    if (!selectedTenantId || role === effectiveRole(target)) return;
    setBusyUserId(target.userId);
    try {
      await changeRole(selectedTenantId, target.userId, role);
      toast.success(`${target.name} is now ${roleLabel(role)}`);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleEnabled = async (target: TenantUser) => {
    if (!selectedTenantId) return;
    setBusyUserId(target.userId);
    try {
      await setUserEnabled(selectedTenantId, target.userId, !target.isEnabled);
      toast.success(
        target.isEnabled ? `${target.name} disabled` : `${target.name} enabled`
      );
      loadUsers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update user status'
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTenantId || !deleteTarget) return;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage users and assign roles within a tenant.
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          disabled={!selectedTenantId}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          New User
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Select
            value={selectedTenantId}
            onValueChange={setSelectedTenantId}
            disabled={sortedTenants.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a tenant" />
            </SelectTrigger>
            <SelectContent>
              {sortedTenants.map((tenant) => (
                <SelectItem key={tenant.tenantId} value={tenant.tenantId}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 min-w-[12rem] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            disabled={!selectedTenantId}
          />
        </div>

        <div className="w-40">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {TENANT_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={loadUsers}
          disabled={isLoading || !selectedTenantId}
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

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!selectedTenantId ? (
        <div className="rounded-xl border bg-card px-4 py-16 text-center text-muted-foreground">
          <UsersIcon className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">Select a tenant</p>
          <p className="text-xs mt-1">
            Choose a tenant above to view and manage its users.
          </p>
        </div>
      ) : isLoading && users.length === 0 ? (
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
              : 'Add the first user to this tenant'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isBusy = busyUserId === u.userId;
                  const currentRole = effectiveRole(u);
                  return (
                    <tr
                      key={u.userId}
                      className="border-b last:border-0 hover:bg-accent/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {u.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <span className="truncate">{u.name}</span>
                              {u.isSysAdmin && (
                                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={currentRole}
                          onValueChange={(value) =>
                            handleRoleChange(u, value as Role)
                          }
                          disabled={isBusy}
                        >
                          <SelectTrigger className="h-8 w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {roleLabel(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={u.isEnabled ? 'default' : 'secondary'}
                          >
                            {u.isEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge
                            variant={u.isApproved ? 'outline' : 'secondary'}
                          >
                            {u.isApproved ? 'Approved' : 'Pending'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                              <span className="sr-only">
                                Actions for {u.name}
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditTarget(u)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleEnabled(u)}
                            >
                              {u.isEnabled ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4" />
                                  Enable
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(u)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
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

      {selectedTenantId && totalPages > 1 && (
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

      <AddUserDialog
        tenantName={tenantName}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAdd}
      />

      <EditUserDialog
        user={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSubmit={handleEdit}
      />

      <DeleteUserDialog
        user={deleteTarget}
        tenantName={tenantName}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
