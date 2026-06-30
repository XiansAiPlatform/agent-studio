import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Layers, Loader2 } from 'lucide-react';
import { EnhancedDeployment } from '../types';

interface PromoteToTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: EnhancedDeployment | null;
  isPromoting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PromoteToTemplateDialog({
  open,
  onOpenChange,
  agent,
  isPromoting,
  onConfirm,
  onCancel
}: PromoteToTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle>Convert to Template</DialogTitle>
              <DialogDescription className="mt-1">
                This will not affect the running agent.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-foreground">
              This creates a new global template from{' '}
              <span className="font-semibold">{agent?.name}</span>, available
              for any tenant to import from the store. The currently running
              agent and its activations are left untouched.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isPromoting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPromoting}
          >
            {isPromoting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Layers className="mr-2 h-4 w-4" />
                Convert to Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
