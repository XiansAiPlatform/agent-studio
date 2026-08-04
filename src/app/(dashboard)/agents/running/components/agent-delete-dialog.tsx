import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Loader2, Info } from 'lucide-react';
import { Agent } from '../types';
import {
  ActionProgressSteps,
  type ActionProgressStep,
} from './action-progress-steps';

export const DELETE_STEPS: ActionProgressStep[] = [
  { id: 'delete', label: 'Undeploy agent instance' },
];

interface AgentDeleteDialogProps {
  open: boolean;
  agent: Agent | null;
  isDeleting: boolean;
  currentStepIndex: number;
  hasFailed?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function AgentDeleteDialog({
  open,
  agent,
  isDeleting,
  currentStepIndex,
  hasFailed = false,
  onOpenChange,
  onConfirm,
}: AgentDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isDeleting && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <DialogTitle>Undeploy Agent Instance</DialogTitle>
              <DialogDescription className="mt-1">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {agent?.status === 'active' && (
            <div className="rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-orange-900 dark:text-orange-200">
                    Agent is Active
                  </h4>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    This agent is currently running. You must deactivate it
                    before you can undeploy it.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-foreground">
              Are you sure you want to undeploy{' '}
              <span className="font-semibold text-destructive">
                {agent?.name}
              </span>
              ?
            </p>
            {agent?.description && (
              <p className="text-xs text-muted-foreground mt-2">
                {agent.description}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-destructive/10">
              <p className="text-xs text-muted-foreground">
                This permanently removes the agent instance. Conversations,
                tasks, and activity logs associated with it may no longer be
                available.
              </p>
            </div>
          </div>

          <ActionProgressSteps
            steps={DELETE_STEPS}
            currentStepIndex={currentStepIndex}
            isRunning={isDeleting}
            hasFailed={hasFailed}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting || agent?.status === 'active'}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Undeploying...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Undeploy Instance
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
