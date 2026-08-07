import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  Trash2,
  Loader2,
  Info,
  Server,
  MessageSquare,
  FileText,
  BookOpen,
  ScrollText,
  CalendarClock,
  BarChart3,
  Star,
} from 'lucide-react';
import { Agent } from '../types';
import {
  ActionProgressSteps,
  type ActionProgressStep,
} from './action-progress-steps';

interface AssociatedDataOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ASSOCIATED_DATA_OPTIONS: AssociatedDataOption[] = [
  { id: 'integrations', label: 'App Integrations', icon: Server },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'schedules', label: 'Schedules', icon: CalendarClock },
  { id: 'performance', label: 'Performance Metrics', icon: BarChart3 },
  { id: 'feedback', label: 'Feedback', icon: Star },
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
  const [selectedData, setSelectedData] = useState<Set<string>>(
    () => new Set(ASSOCIATED_DATA_OPTIONS.map((option) => option.id))
  );

  const allSelected = selectedData.size === ASSOCIATED_DATA_OPTIONS.length;
  const someSelected = selectedData.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelectedData(
      allSelected
        ? new Set()
        : new Set(ASSOCIATED_DATA_OPTIONS.map((option) => option.id))
    );
  };

  const toggleOne = (id: string) => {
    setSelectedData((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const steps: ActionProgressStep[] = useMemo(
    () => [
      { id: 'delete', label: 'Undeploy agent instance' },
      ...ASSOCIATED_DATA_OPTIONS.map((option) => ({
        id: option.id,
        label: `Delete ${option.label}`,
        enabled: selectedData.has(option.id),
      })),
    ],
    [selectedData]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isDeleting && !nextOpen) return;
        if (!nextOpen) {
          setSelectedData(
            new Set(ASSOCIATED_DATA_OPTIONS.map((option) => option.id))
          );
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
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
                This permanently removes the agent instance.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">
                Associated data to delete
              </h4>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-associated-data"
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  disabled={isDeleting}
                />
                <Label
                  htmlFor="select-all-associated-data"
                  className="text-xs font-normal text-muted-foreground cursor-pointer"
                >
                  Select all
                </Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This data isn&apos;t removed automatically otherwise. Uncheck
              anything you&apos;d like to keep.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {ASSOCIATED_DATA_OPTIONS.map(({ id, label, icon: Icon }) => (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox
                    id={`associated-data-${id}`}
                    checked={selectedData.has(id)}
                    onCheckedChange={() => toggleOne(id)}
                    disabled={isDeleting}
                  />
                  <Label
                    htmlFor={`associated-data-${id}`}
                    className="text-xs font-normal text-foreground cursor-pointer"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <ActionProgressSteps
            steps={steps}
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
