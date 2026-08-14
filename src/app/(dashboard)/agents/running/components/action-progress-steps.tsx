import { Check, Loader2, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActionProgressStep = {
  id: string;
  label: string;
};

type StepStatus = 'pending' | 'active' | 'completed' | 'error';

interface ActionProgressStepsProps {
  steps: ActionProgressStep[];
  /** Index of the step currently running. -1 = not started. */
  currentStepIndex: number;
  isRunning: boolean;
  hasFailed?: boolean;
}

function getStepStatus(
  index: number,
  currentStepIndex: number,
  isRunning: boolean,
  hasFailed: boolean
): StepStatus {
  if (!isRunning && currentStepIndex < 0) {
    return 'pending';
  }

  if (index < currentStepIndex) {
    return 'completed';
  }

  if (index === currentStepIndex) {
    if (hasFailed) return 'error';
    if (isRunning) return 'active';
    return 'completed';
  }

  return 'pending';
}

export function ActionProgressSteps({
  steps,
  currentStepIndex,
  isRunning,
  hasFailed = false,
}: ActionProgressStepsProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {isRunning ? 'Progress' : 'Steps'}
      </p>
      <ol className="space-y-2">
        {steps.map((step, index) => {
          const status = getStepStatus(
            index,
            currentStepIndex,
            isRunning,
            hasFailed
          );

          return (
            <li key={step.id} className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0',
                  status === 'completed' && 'bg-primary text-primary-foreground',
                  status === 'active' && 'bg-primary/15 text-primary',
                  status === 'error' && 'bg-destructive/15 text-destructive',
                  status === 'pending' && 'bg-muted text-muted-foreground'
                )}
              >
                {status === 'completed' && <Check className="h-3 w-3" />}
                {status === 'active' && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                {status === 'error' && <X className="h-3 w-3" />}
                {status === 'pending' && <Circle className="h-2.5 w-2.5" />}
              </span>
              <span
                className={cn(
                  'text-sm',
                  status === 'active' && 'font-medium text-foreground',
                  status === 'completed' && 'text-muted-foreground',
                  status === 'error' && 'font-medium text-destructive',
                  status === 'pending' && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
