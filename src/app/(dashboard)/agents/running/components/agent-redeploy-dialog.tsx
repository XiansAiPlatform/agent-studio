import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, Loader2 } from 'lucide-react';
import { Agent } from '../types';
import {
  ActionProgressSteps,
  type ActionProgressStep,
} from './action-progress-steps';

export function getRedeploySteps(isActive: boolean): ActionProgressStep[] {
  const steps: ActionProgressStep[] = [
    { id: 'load', label: 'Load current configuration' },
  ];

  if (isActive) {
    steps.push({ id: 'deactivate', label: 'Deactivate agent' });
  }

  steps.push(
    { id: 'delete', label: 'Undeploy current instance' },
    { id: 'create', label: 'Create new instance' },
    { id: 'activate', label: 'Activate new instance' }
  );

  return steps;
}

interface AgentRedeployDialogProps {
  open: boolean;
  agent: Agent | null;
  isRedeploying: boolean;
  currentStepIndex: number;
  hasFailed?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function AgentRedeployDialog({
  open,
  agent,
  isRedeploying,
  currentStepIndex,
  hasFailed = false,
  onOpenChange,
  onConfirm,
}: AgentRedeployDialogProps) {
  const steps = getRedeploySteps(agent?.status === 'active');

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isRedeploying && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle>Redeploy Agent Instance</DialogTitle>
              <DialogDescription className="mt-1">
                Deactivate, undeploy, and create a fresh instance with the same
                name
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm text-foreground">
              Are you sure you want to redeploy{' '}
              <span className="font-semibold">{agent?.name}</span>?
            </p>
            {agent?.description && (
              <p className="text-xs text-muted-foreground mt-2">
                {agent.description}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                This will stop and undeploy the current instance, then create
                and activate a new one with the same name, template, and
                workflow configuration. Runtime data tied to the old instance
                may be lost.
              </p>
            </div>
          </div>

          <ActionProgressSteps
            steps={steps}
            currentStepIndex={currentStepIndex}
            isRunning={isRedeploying}
            hasFailed={hasFailed}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRedeploying}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isRedeploying}>
            {isRedeploying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redeploying...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Redeploy Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
