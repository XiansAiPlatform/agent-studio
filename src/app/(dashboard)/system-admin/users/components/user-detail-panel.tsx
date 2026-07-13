'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  User,
  ShieldCheck,
  Building2,
  Save,
  Power,
  PowerOff,
  Plus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  GlobalUser,
  TenantUser,
  GlobalUserDetail,
  UserTenantMembership,
  UpdateGlobalUserRequest,
  TENANT_ROLES,
  ALL_ROLES,
  TenantRole,
  Role,
  roleLabel,
  ROLE_METADATA,
} from '../types'
import { RolesHelp } from '@/components/features/users/roles-help'
import { RoleSelectItem } from '@/components/features/users/role-select-item'
import { useUsers } from '../hooks/use-users'
import type { Tenant, ListTenantsResponse } from '@/app/(dashboard)/system-admin/tenants/types'

/**
 * Fetch every tenant on the platform for the "add to tenant" dropdown below.
 * The tenants endpoint paginates, so this walks every page (at the max page
 * size) rather than assuming a single request returns the full list.
 */
async function fetchAllTenantsForDropdown(): Promise<Tenant[]> {
  const collected: Tenant[] = []
  let page = 1
  const maxPageSize = 100
  // Safety cap so an unexpected `hasNext: true` can't loop forever.
  for (let i = 0; i < 1000; i++) {
    const res = await fetch(`/api/system-admin/tenants?page=${page}&pageSize=${maxPageSize}`)
    if (!res.ok) break
    const data: ListTenantsResponse = await res.json()
    collected.push(...(data.tenants ?? []))
    if (!data.pagination?.hasNext) break
    page += 1
  }
  return collected
}

const infoSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or fewer'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
})
type InfoFormValues = z.infer<typeof infoSchema>

interface UserDetailPanelProps {
  /** The user row from the list (GlobalUser or TenantUser). */
  user: GlobalUser | TenantUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after any successful mutation so the parent list can refresh. */
  onRefresh: () => void
}

export function UserDetailPanel({
  user,
  open,
  onOpenChange,
  onRefresh,
}: UserDetailPanelProps) {
  const { fetchUser, updateUser, setSysAdmin, setUserEnabled, addRole, removeRole, createUser, setApproved } = useUsers()

  const [detail, setDetail] = useState<GlobalUserDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [isInfoSaving, setIsInfoSaving] = useState(false)
  const [isSysAdminToggling, setIsSysAdminToggling] = useState(false)
  const [isStatusToggling, setIsStatusToggling] = useState(false)
  // Tracks in-flight role ops as "tenantId:role" strings.
  const [busyRoleOps, setBusyRoleOps] = useState<Set<string>>(new Set())
  // Tracks in-flight approval ops as tenantIds.
  const [busyApprovalOps, setBusyApprovalOps] = useState<Set<string>>(new Set())
  // Per-tenant "add role" picker visibility and selected value.
  const [addRolePickers, setAddRolePickers] = useState<Record<string, TenantRole>>({})

  // ── Add-to-tenant state ──────────────────────────────────────────────────
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [showAddTenant, setShowAddTenant] = useState(false)
  const [addTenantId, setAddTenantId] = useState<string>('')
  const [addTenantRole, setAddTenantRole] = useState<TenantRole>('TenantParticipant')
  const [isAddingTenant, setIsAddingTenant] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<InfoFormValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: { name: '', email: '' },
  })

  const loadDetail = useCallback(async () => {
    if (!user) return
    setIsDetailLoading(true)
    setDetailError(null)
    try {
      const [data] = await Promise.all([
        fetchUser(user.userId),
        fetchAllTenantsForDropdown().then(setAllTenants),
      ])
      setDetail(data)
      reset({ name: data.name ?? '', email: data.email ?? '' })
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load user details')
    } finally {
      setIsDetailLoading(false)
    }
  }, [user, fetchUser, reset])

  useEffect(() => {
    if (open && user) {
      loadDetail()
    }
    if (!open) {
      setDetail(null)
      setDetailError(null)
      setShowAddTenant(false)
      setAddTenantId('')
      setAddTenantRole('TenantParticipant')
      setBusyRoleOps(new Set())
      setAddRolePickers({})
    }
  }, [open, user, loadDetail])

  // ── Profile save ─────────────────────────────────────────────────────────

  const onInfoValid = async (values: InfoFormValues) => {
    if (!user || !detail) return
    const data: UpdateGlobalUserRequest = {}
    if (values.name.trim() !== detail.name) data.name = values.name.trim()
    if (values.email.trim() !== detail.email) data.email = values.email.trim()
    if (Object.keys(data).length === 0) return

    setIsInfoSaving(true)
    try {
      const updated = await updateUser(user.userId, data)
      setDetail(updated)
      reset({ name: updated.name, email: updated.email })
      toast.success('User updated')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setIsInfoSaving(false)
    }
  }

  // ── System Admin toggle ──────────────────────────────────────────────────

  const handleSysAdminToggle = async () => {
    if (!user || !detail) return
    setIsSysAdminToggling(true)
    try {
      const updated = await setSysAdmin(user.userId, !detail.isSysAdmin)
      setDetail(updated)
      toast.success(
        detail.isSysAdmin
          ? `System Admin removed from ${detail.name}`
          : `${detail.name} is now a System Admin`
      )
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update System Admin status')
    } finally {
      setIsSysAdminToggling(false)
    }
  }

  // ── Enable / disable ─────────────────────────────────────────────────────

  const handleStatusToggle = async () => {
    if (!user || !detail) return
    setIsStatusToggling(true)
    try {
      await setUserEnabled(user.userId, !detail.isEnabled)
      // Re-fetch to get the updated state
      const updated = await fetchUser(user.userId)
      setDetail(updated)
      toast.success(detail.isEnabled ? `${detail.name} disabled` : `${detail.name} enabled`)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user status')
    } finally {
      setIsStatusToggling(false)
    }
  }

  // ── Per-tenant multi-role management ────────────────────────────────────

  const markRoleBusy = (tenantId: string, role: Role) =>
    setBusyRoleOps((prev) => new Set(prev).add(`${tenantId}:${role}`))
  const clearRoleBusy = (tenantId: string, role: Role) =>
    setBusyRoleOps((prev) => { const next = new Set(prev); next.delete(`${tenantId}:${role}`); return next })

  const handleAddRole = async (membership: UserTenantMembership, role: Role) => {
    if (!user || !detail) return
    if (membership.roles.includes(role)) return
    markRoleBusy(membership.tenantId, role)
    // Close picker
    setAddRolePickers((prev) => { const next = { ...prev }; delete next[membership.tenantId]; return next })
    try {
      await addRole(membership.tenantId, user.userId, role)
      toast.success(`Role "${roleLabel(role)}" added to ${membership.tenantName}`)
      const updated = await fetchUser(user.userId)
      setDetail(updated)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add role')
    } finally {
      clearRoleBusy(membership.tenantId, role)
    }
  }

  const handleRemoveRole = async (membership: UserTenantMembership, role: Role) => {
    if (!user || !detail) return
    markRoleBusy(membership.tenantId, role)
    try {
      await removeRole(membership.tenantId, user.userId, role)
      toast.success(`Role "${roleLabel(role)}" removed from ${membership.tenantName}`)
      const updated = await fetchUser(user.userId)
      setDetail(updated)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove role')
    } finally {
      clearRoleBusy(membership.tenantId, role)
    }
  }

  // ── Add user to a new tenant ─────────────────────────────────────────────

  const handleAddToTenant = async () => {
    if (!user || !detail || !addTenantId) return
    setIsAddingTenant(true)
    try {
      await createUser(addTenantId, {
        email: detail.email,
        name: detail.name,
        role: addTenantRole,
      })
      const selectedTenant = allTenants.find((t) => t.tenantId === addTenantId)
      toast.success(
        `${detail.name} added to "${selectedTenant?.name ?? addTenantId}" as ${roleLabel(addTenantRole)}`
      )
      setShowAddTenant(false)
      setAddTenantId('')
      setAddTenantRole('TenantParticipant')
      const updated = await fetchUser(user.userId)
      setDetail(updated)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add user to tenant')
    } finally {
      setIsAddingTenant(false)
    }
  }

  // ── Approval toggle (per tenant) ────────────────────────────────────────

  const handleApprovalToggle = async (membership: UserTenantMembership) => {
    if (!user || !detail) return
    setBusyApprovalOps((prev) => new Set(prev).add(membership.tenantId))
    try {
      await setApproved(membership.tenantId, user.userId, !membership.isApproved)
      toast.success(
        membership.isApproved
          ? `Approval removed for ${membership.tenantName}`
          : `${detail.name} approved in ${membership.tenantName}`
      )
      const updated = await fetchUser(user.userId)
      setDetail(updated)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update approval status')
    } finally {
      setBusyApprovalOps((prev) => {
        const next = new Set(prev)
        next.delete(membership.tenantId)
        return next
      })
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!user) return null

  const initials = (detail?.name ?? user.name)?.charAt(0).toUpperCase() || '?'
  const isSysAdmin = detail?.isSysAdmin ?? ('isSysAdmin' in user ? user.isSysAdmin : false)
  const isEnabled = detail?.isEnabled ?? ('isEnabled' in user ? user.isEnabled : true)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-2xl p-0 gap-0">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-5 border-b">
          <div className="flex items-center gap-4 pr-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold truncate">
                {detail?.name ?? user.name}
              </SheetTitle>
              <SheetDescription className="text-sm truncate mt-0.5">
                {detail?.email ?? user.email}
              </SheetDescription>
            </div>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {isSysAdmin && (
                <Badge variant="default" className="gap-1 text-xs">
                  <ShieldCheck className="h-3 w-3" />
                  Sys Admin
                </Badge>
              )}
              <Badge variant={isEnabled ? 'outline' : 'secondary'} className="text-xs">
                {isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        {isDetailLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : detailError ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive text-center">
              {detailError}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Profile */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">User Details</h3>
              </div>
              <form
                id="user-detail-info-form"
                onSubmit={handleSubmit(onInfoValid)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="detail-name">Name</Label>
                  <Input id="detail-name" autoComplete="off" {...register('name')} />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detail-email">Email</Label>
                  <Input id="detail-email" type="email" autoComplete="off" {...register('email')} />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isInfoSaving || !isDirty}
                >
                  {isInfoSaving
                    ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    : <Save className="mr-2 h-3.5 w-3.5" />}
                  Save Changes
                </Button>
              </form>
            </div>

            <Separator />

            {/* System Admin + Account status */}
            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Access & Status</h3>
              </div>

              {/* SysAdmin toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 min-w-0 mr-4">
                  <p className="text-sm font-medium">System Admin</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_METADATA.SysAdmin.description}
                  </p>
                </div>
                {isSysAdminToggling ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
                ) : (
                  <Switch
                    checked={isSysAdmin}
                    onCheckedChange={handleSysAdminToggle}
                    disabled={isSysAdminToggling}
                  />
                )}
              </div>

              {/* Enable / disable */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 min-w-0 mr-4">
                  <p className={`text-sm font-medium ${!isEnabled ? "text-destructive" : ""}`}>Account {isEnabled ? "Enabled" : "Disabled"}</p>
                  <p className={`text-xs ${!isEnabled ? "text-destructive/70" : "text-muted-foreground"}`}>
                    {isEnabled
                      ? "This account is active and can log in to assigned tenants."
                      : "Disabled accounts cannot log in to any tenant."}
                  </p>
                </div>
                {isStatusToggling ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStatusToggle}
                    disabled={isStatusToggling}
                    className={isEnabled ? '' : 'text-destructive border-destructive/50 hover:bg-destructive/10'}
                  >
                    {isEnabled
                      ? <><PowerOff className="mr-1.5 h-3.5 w-3.5" />Disable</>
                      : <><Power className="mr-1.5 h-3.5 w-3.5" />Enable</>}
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Tenant role assignments */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Tenant Roles</h3>
                  <RolesHelp roles={ALL_ROLES} />
                </div>
                <div className="flex items-center gap-2">
                  {detail && detail.memberships.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {detail.memberships.length}{' '}
                      {detail.memberships.length === 1 ? 'tenant' : 'tenants'}
                    </Badge>
                  )}
                  {detail && !showAddTenant && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => setShowAddTenant(true)}
                    >
                      <Plus className="h-3 w-3" />
                      Add Tenant
                    </Button>
                  )}
                </div>
              </div>

              {/* Inline add-to-tenant form */}
              {showAddTenant && detail && (() => {
                const joinedIds = new Set(detail.memberships.map((m) => m.tenantId))
                const available = allTenants.filter((t) => !joinedIds.has(t.tenantId))
                return (
                  <div className="mb-3 rounded-lg border bg-muted/30 p-3 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Add to tenant</p>
                    <div className="space-y-2">
                      <Select
                        value={addTenantId}
                        onValueChange={setAddTenantId}
                        disabled={isAddingTenant}
                      >
                        <SelectTrigger className="h-8 w-full text-xs">
                          <SelectValue placeholder="Select tenant…" />
                        </SelectTrigger>
                        <SelectContent>
                          {available.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                              No other tenants available
                            </div>
                          ) : (
                            available.map((t) => (
                              <SelectItem key={t.tenantId} value={t.tenantId} className="text-xs">
                                {t.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Select
                        value={addTenantRole}
                        onValueChange={(v) => setAddTenantRole(v as TenantRole)}
                        disabled={isAddingTenant}
                      >
                        <SelectTrigger className="h-8 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)]">
                          {TENANT_ROLES.map((role) => (
                            <RoleSelectItem key={role} role={role} />
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={!addTenantId || isAddingTenant}
                        onClick={handleAddToTenant}
                      >
                        {isAddingTenant
                          ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          : <Plus className="mr-1 h-3 w-3" />}
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isAddingTenant}
                        onClick={() => {
                          setShowAddTenant(false)
                          setAddTenantId('')
                          setAddTenantRole('TenantParticipant')
                        }}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )
              })()}

              {!detail || detail.memberships.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center">
                  <Building2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No tenant memberships</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {detail.memberships.map((m) => {
                      const assignedRoles = (m.roles ?? []) as Role[]
                      const availableRoles = TENANT_ROLES.filter((r) => !assignedRoles.includes(r))
                      const pickerRole = addRolePickers[m.tenantId]
                      const showPicker = pickerRole !== undefined || m.tenantId in addRolePickers
                      return (
                        <div
                          key={m.tenantId}
                          className="rounded-lg border px-3 py-2.5 space-y-2"
                        >
                          {/* Tenant name + Approved toggle */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{m.tenantName}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.tenantId}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {busyApprovalOps.has(m.tenantId) ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <>
                                  <span className={`text-xs ${m.isApproved ? 'text-muted-foreground' : 'text-amber-600 font-medium'}`}>
                                    {m.isApproved ? 'Approved' : 'Pending'}
                                  </span>
                                  <Switch
                                    checked={m.isApproved}
                                    onCheckedChange={() => handleApprovalToggle(m)}
                                    aria-label={`Toggle approval for ${m.tenantName}`}
                                  />
                                </>
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* Role rows — each has a select (change) + remove button */}
                          <div className="space-y-1.5">
                            {assignedRoles.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">No roles</span>
                            ) : (
                              assignedRoles.map((role) => {
                                const isBusy = busyRoleOps.has(`${m.tenantId}:${role}`)
                                return (
                                  <div key={role} className="flex items-center gap-1.5">
                                    {isBusy ? (
                                      <div className="flex items-center gap-1.5 flex-1">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">{roleLabel(role)}</span>
                                      </div>
                                    ) : (
                                      <>
                                        <Select
                                          value={role}
                                          onValueChange={(newRole) => {
                                            if (newRole !== role) handleAddRole(m, newRole as Role)
                                          }}
                                        >
                                          <SelectTrigger className="h-7 flex-1 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="w-[var(--radix-select-trigger-width)]">
                                            {TENANT_ROLES.map((r) => (
                                              <RoleSelectItem key={r} role={r} />
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveRole(m, role)}
                                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive focus:outline-none"
                                          aria-label={`Remove ${roleLabel(role)}`}
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>

                          {/* Add-role picker button (non-SysAdmin only) */}
                          {availableRoles.length > 0 && !showPicker && (
                            <button
                              type="button"
                              onClick={() =>
                                setAddRolePickers((prev) => ({
                                  ...prev,
                                  [m.tenantId]: availableRoles[0],
                                }))
                              }
                              className="inline-flex items-center gap-0.5 rounded border border-dashed px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                              Add role
                            </button>
                          )}

                          {/* Inline add-role form */}
                          {showPicker && (
                            <div className="flex items-center gap-2 pt-0.5">
                              <Select
                                value={addRolePickers[m.tenantId] ?? availableRoles[0]}
                                onValueChange={(v) =>
                                  setAddRolePickers((prev) => ({ ...prev, [m.tenantId]: v as TenantRole }))
                                }
                              >
                                <SelectTrigger className="h-7 flex-1 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                                  {availableRoles.map((role) => (
                                    <RoleSelectItem key={role} role={role} />
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() =>
                                  handleAddRole(m, (addRolePickers[m.tenantId] ?? availableRoles[0]) as Role)
                                }
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() =>
                                  setAddRolePickers((prev) => {
                                    const next = { ...prev }
                                    delete next[m.tenantId]
                                    return next
                                  })
                                }
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="border-t px-6 py-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
