'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Contact as ContactIcon, Plus, Search, Pencil, Trash2, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  DashboardPage,
  DashboardPageBody,
  DashboardPageHeader,
} from '@/components/layout/dashboard-page'
import { useContacts } from './hooks/use-contacts'
import { Contact, ContactRequest } from './types'
import { ContactDialog } from './components/contact-dialog'
import { DeleteContactDialog } from './components/delete-contact-dialog'

export default function ContactsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Contact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { contacts, isLoading, error, fetchContacts, createContact, updateContact, deleteContact } =
    useContacts()

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    fetchContacts(debouncedSearch)
  }, [debouncedSearch, fetchContacts])

  const openAdd = () => {
    setEditTarget(null)
    setDialogOpen(true)
  }

  const openEdit = (contact: Contact) => {
    setEditTarget(contact)
    setDialogOpen(true)
  }

  // Errors are not caught here: the dialog shows them next to the form.
  const handleSave = async (data: ContactRequest) => {
    if (editTarget) {
      await updateContact(editTarget.id, data)
      toast.success('Contact updated')
    } else {
      await createContact(data)
      toast.success(`Contact "${data.name}" added`)
    }
    fetchContacts(debouncedSearch)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteContact(deleteTarget.id)
      toast.success(`${deleteTarget.name} deleted`)
      setDeleteTarget(null)
      fetchContacts(debouncedSearch)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contact')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Contacts"
        description="People who receive notifications for this tenant"
        icon={<ContactIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />}
        actions={
          <Button onClick={openAdd} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        }
      />

      <DashboardPageBody>
        {/* Search + refresh */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-base sm:text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchContacts(debouncedSearch)}
            disabled={isLoading}
            title="Refresh"
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && contacts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading contacts…
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center text-muted-foreground">
                      <ContactIcon className="h-8 w-8 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-foreground">No contacts yet</p>
                      <p className="text-xs mt-1">
                        {debouncedSearch ? 'Try a different search term' : 'Add the first contact to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr key={contact.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{contact.name}</td>
                      <td className="px-4 py-3 text-muted-foreground break-all">{contact.email}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {contact.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(contact)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit {contact.name}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(contact)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete {contact.name}</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardPageBody>

      <ContactDialog
        contact={editTarget}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSave}
      />

      <DeleteContactDialog
        contact={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </DashboardPage>
  )
}
