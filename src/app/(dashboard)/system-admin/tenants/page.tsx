'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-permissions';
import { RequireCapability } from '@/components/auth/can';
import {
  Building2,
  Plus,
  Search,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTenants } from './hooks/use-tenants';
import { Tenant, CreateTenantRequest, UpdateTenantRequest } from './types';
import { AddTenantDialog } from './components/add-tenant-dialog';
import { EditTenantDialog } from './components/edit-tenant-dialog';
import { DeleteTenantDialog } from './components/delete-tenant-dialog';

function TenantsPageContent() {
  const { isLoading: isAuthLoading } = useAuth();

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

  const isSystemAdmin = useCan('system:admin');

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
      toast.success(`Tenant "${data.name}" created`);
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
      const updated = await updateTenant(tenant.tenantId, { enabled: !tenant.enabled });
      toast.success(
        tenant.enabled
          ? `${tenant.name} disabled`
          : `${tenant.name} enabled`
      );
      // Keep the edit panel open with the updated tenant data
      setEditTarget(updated);
      fetchTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setTogglingTenantId(null);
    }
  };

  const handleDeleteRequest = (tenant: Tenant) => {
    setDeleteTarget(tenant);
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
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTenants.map((tenant) => (
            <Card
              key={tenant.id}
              className="transition-colors hover:bg-accent/40 cursor-pointer"
              onClick={() => setEditTarget(tenant)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate">{tenant.name}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                        {tenant.tenantId}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={tenant.enabled ? 'default' : 'secondary'}
                    className="text-xs px-1.5 py-0 shrink-0"
                  >
                    {tenant.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground border-t pt-3">
                  {tenant.domain && (
                    <div className="truncate">
                      <span className="block text-[10px] uppercase tracking-wide font-medium text-muted-foreground/60">Domain</span>
                      <span className="font-medium text-foreground truncate block">{tenant.domain}</span>
                    </div>
                  )}
                  {tenant.timezone && (
                    <div className="truncate">
                      <span className="block text-[10px] uppercase tracking-wide font-medium text-muted-foreground/60">Timezone</span>
                      <span className="font-medium text-foreground truncate block">{tenant.timezone}</span>
                    </div>
                  )}
                  <div className="truncate">
                    <span className="block text-[10px] uppercase tracking-wide font-medium text-muted-foreground/60">Created</span>
                    <span className="font-medium text-foreground">{new Date(tenant.createdAt).toLocaleDateString()}</span>
                  </div>
                  {tenant.description && (
                    <div className="col-span-2 truncate">
                      <span className="block text-[10px] uppercase tracking-wide font-medium text-muted-foreground/60">Description</span>
                      <span className="text-foreground/80 truncate block">{tenant.description}</span>
                    </div>
                  )}
                </div>
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
        onToggleEnabled={handleToggleEnabled}
        onDeleteRequest={handleDeleteRequest}
        isToggling={togglingTenantId === editTarget?.tenantId}
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

export default function TenantsPage() {
  return (
    <RequireCapability
      permission="system:admin"
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TenantsPageContent />
    </RequireCapability>
  );
}
