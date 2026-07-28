import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Agent } from '../types';

interface AgentRestartDialogProps {
  open: boolean;
  agent: Agent | null;
  isRestarting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function AgentRestartDialog({
  open,
  agent,
  isRestarting,
  onOpenChange,
  onConfirm,
}: AgentRestartDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle>Restart Agent Instance</DialogTitle>
              <DialogDescription className="mt-1">
                Deactivate and reactivate with the same configuration
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm text-foreground">
              Are you sure you want to restart{' '}
              <span className="font-semibold">{agent?.name}</span>?
            </p>
            {agent?.description && (
              <p className="text-xs text-muted-foreground mt-2">
                {agent.description}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                This will briefly stop the agent, then start it again using its
                current workflow configuration. Active tasks and conversations
                may be interrupted.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRestarting}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isRestarting}>
            {isRestarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Restarting...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Restart Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
