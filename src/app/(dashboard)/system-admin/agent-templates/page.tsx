'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-permissions';
import { RequireCapability } from '@/components/auth/can';
import {
  Package,
  Search,
  Loader2,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Eye,
  Workflow,
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
import { useTenants } from '../tenants/hooks/use-tenants';
import { useAgentTemplates } from './hooks/use-agent-templates';
import { AgentTemplate } from './types';
import { TemplateDetailPanel } from './components/template-detail-panel';
import { DeleteTemplateDialog } from './components/delete-template-dialog';
import {
  DashboardPage,
  DashboardPageBody,
  DashboardPageHeader,
} from '@/components/layout/dashboard-page';

function formatDate(value: string | undefined | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function AgentTemplatesPageContent() {
  const { isLoading: isAuthLoading } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [detailTarget, setDetailTarget] = useState<AgentTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgentTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tenant names are used to label deployments below — the full tenant list
  // is needed for that lookup, not a single page (see the Tenants management
  // page for the paginated view via `fetchTenants`/`tenants`).
  const { allTenants: tenants, fetchAllTenants: fetchTenants } = useTenants();
  const {
    templates,
    isLoading,
    error,
    fetchTemplates,
    fetchDeployments,
    deleteTemplate,
  } = useAgentTemplates();

  const isSystemAdmin = useCan('system:admin');

  useEffect(() => {
    if (isSystemAdmin) {
      fetchTemplates();
      // Tenant names are used to label deployments in the detail panel and
      // the delete-confirmation warning.
      fetchTenants();
    }
  }, [isSystemAdmin, fetchTemplates, fetchTenants]);

  const tenantNameById = useMemo(
    () =>
      Object.fromEntries(tenants.map((t) => [t.tenantId, t.name])) as Record<
        string,
        string
      >,
    [tenants]
  );

  const filteredTemplates = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => {
      const { name, description, summary, category, author } = t.agent;
      return [name, description, summary, category, author]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [templates, searchInput]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTemplate(deleteTarget.agent.id);
      toast.success(`Template "${deleteTarget.agent.name}" deleted`);
      setDeleteTarget(null);
      // If the deleted template was open in the detail panel, close it too.
      if (detailTarget?.agent.id === deleteTarget.agent.id) {
        setDetailTarget(null);
      }
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template');
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
    <DashboardPage>
      <DashboardPageHeader
        title="Agent Templates"
        description="Manage system-wide agent templates and review where they are deployed."
        icon={<Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />}
      />

      <DashboardPageBody className="space-y-6">
      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[12rem] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, category, or author…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={fetchTemplates}
          disabled={isLoading}
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        {filteredTemplates.length > 0 && (
          <span className="text-sm text-muted-foreground ml-auto">
            {filteredTemplates.length}{' '}
            {filteredTemplates.length === 1 ? 'template' : 'templates'}
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
      {isLoading && templates.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-16 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading templates…
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-16 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">No agent templates found</p>
          <p className="text-xs mt-1">
            {searchInput.trim()
              ? 'Try a different search'
              : 'Promote a tenant agent to a template to get started'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Template</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Workflows</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => {
                  const { agent, definitions } = template;
                  const isSelected = detailTarget?.agent.id === agent.id;
                  return (
                    <tr
                      key={agent.id}
                      className={`border-b last:border-0 transition-colors cursor-pointer ${
                        isSelected ? 'bg-accent/40' : 'hover:bg-accent/20'
                      }`}
                      onClick={() => setDetailTarget(template)}
                    >
                      {/* Template */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {agent.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-md">
                              {agent.summary || agent.description || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        {agent.category ? (
                          <Badge variant="outline" className="text-xs">
                            {agent.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Version */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {agent.version || '—'}
                      </td>

                      {/* Workflows */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Workflow className="h-3.5 w-3.5 shrink-0" />
                          <span>{definitions.length}</span>
                        </div>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3">
                        <div className="text-foreground">{formatDate(agent.createdAt)}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[12rem]">
                          {agent.createdBy}
                        </div>
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
                              <span className="sr-only">Actions for {agent.name}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailTarget(template)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(template)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Template
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
      </DashboardPageBody>

      {/* ── Dialogs / panels ────────────────────────────────────── */}
      <TemplateDetailPanel
        template={detailTarget}
        open={detailTarget !== null}
        onOpenChange={(open) => { if (!open) setDetailTarget(null); }}
        fetchDeployments={fetchDeployments}
        tenantNameById={tenantNameById}
        onDelete={(template) => setDeleteTarget(template)}
      />

      <DeleteTemplateDialog
        template={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        fetchDeployments={fetchDeployments}
        tenantNameById={tenantNameById}
      />
    </DashboardPage>
  );
}

export default function AgentTemplatesPage() {
  return (
    <RequireCapability
      permission="system:admin"
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AgentTemplatesPageContent />
    </RequireCapability>
  );
}
