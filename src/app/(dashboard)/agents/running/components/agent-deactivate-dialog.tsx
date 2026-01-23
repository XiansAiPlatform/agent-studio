import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Power, Loader2 } from 'lucide-react';
import { Agent } from '../types';

interface AgentDeactivateDialogProps {
  open: boolean;
  agent: Agent | null;
  isDeactivating: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function AgentDeactivateDialog({
  open,
  agent,
  isDeactivating,
  onOpenChange,
  onConfirm,
}: AgentDeactivateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Power className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <DialogTitle>Deactivate Agent Instance</DialogTitle>
              <DialogDescription className="mt-1">
                Stop this agent from running
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <div className="rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-4">
            <p className="text-sm text-foreground">
              Are you sure you want to deactivate{' '}
              <span className="font-semibold text-orange-900 dark:text-orange-200">
                {agent?.name}
              </span>
              ?
            </p>
            {agent?.description && (
              <p className="text-xs text-muted-foreground mt-2">
                {agent.description}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-900">
              <p className="text-xs text-muted-foreground">
                This will stop the agent from processing new tasks and conversations. You can reactivate it later.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeactivating}
          >
            Cancel
          </Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={onConfirm}
            disabled={isDeactivating}
          >
            {isDeactivating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              <>
                <Power className="mr-2 h-4 w-4" />
                Deactivate Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
