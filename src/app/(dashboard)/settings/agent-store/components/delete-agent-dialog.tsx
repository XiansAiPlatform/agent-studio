import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { EnhancedDeployment } from '../types';

interface DeleteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: EnhancedDeployment | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAgentDialog({
  open,
  onOpenChange,
  agent,
  isDeleting,
  onConfirm,
  onCancel
}: DeleteAgentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <DialogTitle>Remove from Tenant</DialogTitle>
              <DialogDescription className="mt-1">
                You can add it back later.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-foreground">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-destructive">
                {agent?.name}
              </span>
              {' '} from your tenant?
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Offboard from Organization
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
