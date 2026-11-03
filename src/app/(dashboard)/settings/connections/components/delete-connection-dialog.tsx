import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react'
import { OIDCConnection } from '../types'
import { ConnectionIcon, getConnectionDisplayName } from './connection-icon'

interface DeleteConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: OIDCConnection | null
  onConfirm: () => void
  isDeleting?: boolean
}

// Single delete confirmation used by both the card "…" menu and the
// integration details sheet's Danger Zone.
export function DeleteConnectionDialog({
  open,
  onOpenChange,
  connection,
  onConfirm,
  isDeleting = false
}: DeleteConnectionDialogProps) {
  if (!connection) return null

  const displayName = getConnectionDisplayName(connection.providerId)
  // Integrations (Slack, Teams, webhooks) carry a platformId; OAuth/OIDC
  // connections do not.
  const isIntegration = Boolean(connection.platformId)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Connection
          </AlertDialogTitle>
          {/* asChild renders a <div>, so the block content below is valid
              HTML (a <p> cannot contain <p>/<div>/<ul>). */}
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>
                Are you sure you want to delete the connection{' '}
                <span className="font-semibold [overflow-wrap:anywhere]">"{connection.name}"</span>?
              </div>

              <div className="bg-muted p-3 rounded-md text-sm">
                <div className="flex items-center gap-3 mb-2">
                  <ConnectionIcon providerId={connection.providerId} size={24} />
                  <span className="font-medium">{displayName}</span>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="capitalize">{connection.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(connection.createdAt).toLocaleDateString()}</span>
                  </div>
                  {connection.usageCount !== undefined && (
                    <div className="flex justify-between">
                      <span>Usage count:</span>
                      <span>{connection.usageCount}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                <div className="text-sm text-destructive font-medium mb-1">
                  ⚠️ This action cannot be undone
                </div>
                {isIntegration ? (
                  <ul className="text-sm text-destructive/80 space-y-1">
                    <li>• The external platform will no longer be able to communicate with the agent</li>
                    <li>• All webhook configurations will be permanently removed</li>
                    <li>• Integration history and logs will be deleted</li>
                  </ul>
                ) : (
                  <ul className="text-sm text-destructive/80 space-y-1">
                    <li>• All stored authentication tokens will be revoked</li>
                    <li>• Any agents using this connection will lose access</li>
                    <li>• Connection history and usage data will be deleted</li>
                  </ul>
                )}
              </div>

              {isIntegration ? (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <div className="text-sm text-amber-900 font-medium mb-2">
                    📋 Before deleting, please clean up external resources:
                  </div>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Remove webhook URLs from the external platform ({connection.platformId})</li>
                    <li>Revoke any API tokens or credentials configured externally</li>
                    <li>Disable the app/bot integration in the external platform</li>
                    <li>Delete or uninstall the app from your workspace if applicable</li>
                  </ul>
                </div>
              ) : (
                <div className="text-sm">
                  You can always recreate this connection later with the same configuration.
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Connection
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
