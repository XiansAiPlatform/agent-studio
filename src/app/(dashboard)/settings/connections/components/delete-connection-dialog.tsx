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
import { Loader2, AlertTriangle } from 'lucide-react'
import { OIDCConnection } from '../types'
import { OIDC_PROVIDERS } from '@/config/oidc-providers'

interface DeleteConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: OIDCConnection | null
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteConnectionDialog({
  open,
  onOpenChange,
  connection,
  onConfirm,
  isDeleting = false
}: DeleteConnectionDialogProps) {
  if (!connection) return null

  const provider = OIDC_PROVIDERS[connection.providerId]
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Connection
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete the connection{' '}
              <span className="font-semibold">"{connection.name}"</span>?
            </p>
            
            <div className="bg-muted p-3 rounded-md text-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{provider?.icon || '🔗'}</span>
                <span className="font-medium">{provider?.displayName || connection.providerId}</span>
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
              <p className="text-sm text-destructive font-medium mb-1">
                ⚠️ This action cannot be undone
              </p>
              <ul className="text-sm text-destructive/80 space-y-1">
                <li>• All stored authentication tokens will be revoked</li>
                <li>• Any agents using this connection will lose access</li>
                <li>• Connection history and usage data will be deleted</li>
              </ul>
            </div>

            <p className="text-sm">
              To confirm deletion, you can always recreate this connection later with the same configuration.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Connection'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}