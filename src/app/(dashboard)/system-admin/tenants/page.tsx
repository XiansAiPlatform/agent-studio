'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  Building2,
  Plus,
  Search,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTenants } from './hooks/use-tenants';
import { Tenant, CreateTenantRequest, UpdateTenantRequest } from './types';
import { AddTenantDialog } from './components/add-tenant-dialog';
import { EditTenantDialog } from './components/edit-tenant-dialog';
import { DeleteTenantDialog } from './components/delete-tenant-dialog';

export default function TenantsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingTenantId, setTogglingTenantId] = useState<string | null>(null);

  const {
    tenants,
    isLoading,
    error,
    fetchTenants,
    createTenant,
    updateTenant,
    deleteTenant,
  } = useTenants();

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

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...tenants].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
    if (!q) return sorted;
    return sorted.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.tenantId.toLowerCase().includes(q) ||
        (t.domain ?? '').toLowerCase().includes(q)
    );
  }, [tenants, search]);

  const handleAdd = async (data: CreateTenantRequest) => {
    try {
      await createTenant(data);
      toast.success(`Tenant “${data.name}” created`);
      fetchTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create tenant');
      throw err;
    }
  };

  const handleEdit = async (tenantId: string, data: UpdateTenantRequest) => {
    try {
      await updateTenant(tenantId, data);
      toast.success('Tenant updated');
      fetchTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tenant');
      throw err;
    }
  };

  const handleToggleEnabled = async (tenant: Tenant) => {
    setTogglingTenantId(tenant.tenantId);
    try {
      await updateTenant(tenant.tenantId, { enabled: !tenant.enabled });
      toast.success(
        tenant.enabled
          ? `${tenant.name} disabled`
          : `${tenant.name} enabled`
      );
      fetchTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setTogglingTenantId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTenant(deleteTarget.tenantId);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      fetchTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete tenant');
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
          <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all tenants across the platform.
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Tenant
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchTenants()}
          disabled={isLoading}
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        {tenants.length > 0 && (
          <span className="text-sm text-muted-foreground ml-auto">
            {tenants.length} {tenants.length === 1 ? 'tenant' : 'tenants'}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading && tenants.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-16 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading tenants…
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-16 text-center text-muted-foreground">
          <Building2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">No tenants found</p>
          <p className="text-xs mt-1">
            {search
              ? 'Try a different search term'
              : 'Create the first tenant to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTenants.map((tenant) => (
            <Card key={tenant.id} className="transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{tenant.name}</CardTitle>
                      <CardDescription className="text-xs font-mono">
                        {tenant.tenantId}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={tenant.enabled ? 'default' : 'secondary'}>
                      {tenant.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {togglingTenantId === tenant.tenantId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                          <span className="sr-only">Actions for {tenant.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTarget(tenant)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleEnabled(tenant)}>
                          {tenant.enabled ? (
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
                          onClick={() => setDeleteTarget(tenant)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  {tenant.domain && (
                    <span>
                      Domain:{' '}
                      <span className="font-medium text-foreground">
                        {tenant.domain}
                      </span>
                    </span>
                  )}
                  {tenant.timezone && (
                    <span>
                      Timezone:{' '}
                      <span className="font-medium text-foreground">
                        {tenant.timezone}
                      </span>
                    </span>
                  )}
                  <span>
                    Created:{' '}
                    <span className="font-medium text-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                </div>
                {tenant.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {tenant.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddTenantDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAdd}
      />

      <EditTenantDialog
        tenant={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSubmit={handleEdit}
      />

      <DeleteTenantDialog
        tenant={deleteTarget}
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
