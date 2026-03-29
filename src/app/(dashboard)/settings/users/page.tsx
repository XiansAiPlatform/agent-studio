'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUsers } from './hooks/use-users'
import { TenantUser, ParticipantRole } from './types'
import { AddUserDialog } from './components/add-user-dialog'
import { EditUserDialog } from './components/edit-user-dialog'
import { DeleteUserDialog } from './components/delete-user-dialog'

const ROLE_LABEL: Record<ParticipantRole, string> = {
  TenantParticipant: 'User',
  TenantParticipantAdmin: 'Admin',
}

const PAGE_SIZE = 20

export default function UsersPage() {
  const { data: session } = useSession()
  const currentUserEmail = session?.user?.email

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editTarget, setEditTarget] = useState<TenantUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { users, totalCount, isLoading, error, fetchUsers, createUser, updateUser, deleteUser } =
    useUsers({ page, pageSize: PAGE_SIZE, search: debouncedSearch })

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  // Fetch on mount and whenever page / search changes
  useEffect(() => {
    fetchUsers(page, debouncedSearch)
  }, [page, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [users, sortDir])

  const handleRefresh = useCallback(() => {
    fetchUsers(page, debouncedSearch)
  }, [fetchUsers, page, debouncedSearch])

  // ── Add ──────────────────────────────────────────────────────────────────
  const handleAdd = async (data: { email: string; name: string; role: ParticipantRole }) => {
    try {
      await createUser(data)
      toast.success(`User "${data.name}" added successfully`)
      fetchUsers(page, debouncedSearch)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add user')
      throw err
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  const handleEdit = async (
    userId: string,
    data: {
      name?: string
      email?: string
      isApproved?: boolean
      role?: ParticipantRole
    }
  ) => {
    try {
      await updateUser(userId, data)
      toast.success('User updated successfully')
      fetchUsers(page, debouncedSearch)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
      throw err
    }
  }

  // ── Toggle approved ───────────────────────────────────────────────────────
  const handleToggleApproved = async (user: TenantUser) => {
    if (user.email === currentUserEmail) {
      toast.error("You can't change your own approval status")
      return
    }
    setTogglingUserId(user.userId)
    try {
      await updateUser(user.userId, { isApproved: !user.isApproved })
      toast.success(
        !user.isApproved ? `${user.name} has been approved` : `${user.name} has been unapproved`
      )
      fetchUsers(page, debouncedSearch)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update approval status')
    } finally {
      setTogglingUserId(null)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteUser(deleteTarget.userId)
      toast.success(`${deleteTarget.name} removed from tenant`)
      setDeleteTarget(null)
      fetchUsers(page, debouncedSearch)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove user')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                Users
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage participant users for this tenant
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6 space-y-4">
        {/* Search + refresh */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
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

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <button
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Name
                    {sortDir === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Approved</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-foreground">No users found</p>
                    <p className="text-xs mt-1">
                      {debouncedSearch
                        ? 'Try a different search term'
                        : 'Add the first user to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => (
                  <tr
                    key={user.userId}
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{user.name}</div>
                      <div className="text-xs text-muted-foreground md:hidden">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      {user.role === 'TenantParticipantAdmin' ? (
                        <Badge
                          variant="default"
                          className="gap-1 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/15"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {ROLE_LABEL[user.role]}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {togglingUserId === user.userId ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={user.isApproved}
                          onCheckedChange={() => handleToggleApproved(user)}
                          disabled={user.email === currentUserEmail}
                          title={user.email === currentUserEmail ? "You can't change your own approval status" : undefined}
                          aria-label={`Toggle approved for ${user.name}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions for {user.name}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditTarget(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(user)}
                            className="text-destructive focus:text-destructive"
                            disabled={user.email === currentUserEmail}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove from tenant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddUserDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAdd}
      />

      <EditUserDialog
        user={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        onSubmit={handleEdit}
        isSelf={editTarget?.email === currentUserEmail}
      />

      <DeleteUserDialog
        user={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  )
}
