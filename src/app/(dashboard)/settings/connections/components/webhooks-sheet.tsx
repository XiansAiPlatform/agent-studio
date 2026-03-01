'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Plus,
  Webhook,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';

interface WebhooksSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
  agentName?: string | null;
  activationName?: string | null;
  /** Called after a webhook is created so the parent can refetch the main list */
  onCreated?: () => void;
}

export function WebhooksSheet({
  open,
  onOpenChange,
  tenantId,
  agentName,
  activationName,
  onCreated,
}: WebhooksSheetProps) {
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [useDefaultOptions, setUseDefaultOptions] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Create form state
  const [createAgentName, setCreateAgentName] = useState(agentName || 'DefaultAgent');
  const [createActivationName, setCreateActivationName] = useState(activationName || 'DefaultActivation');
  const [createWebhookName, setCreateWebhookName] = useState('Default');
  const [createWorkflowName, setCreateWorkflowName] = useState('Integrator Workflow');
  const [createParticipantId, setCreateParticipantId] = useState('webhook');
  const [createTimeout, setCreateTimeout] = useState(30);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (agentName) setCreateAgentName(agentName);
    if (activationName) setCreateActivationName(activationName);
  }, [agentName, activationName]);

  const validateCreate = (): boolean => {
    const err: Record<string, string> = {};
    if (!createAgentName?.trim()) err.agentName = 'Agent name is required';
    if (!createActivationName?.trim()) err.activationName = 'Activation name is required';
    if (createTimeout < 1 || createTimeout > 300) {
      err.timeout = 'Timeout must be between 1 and 300 seconds';
    }
    setCreateErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !validateCreate()) return;
    setIsCreating(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: createAgentName.trim(),
          activationName: createActivationName.trim(),
          name: !useDefaultOptions && createWebhookName?.trim() ? createWebhookName.trim() : undefined,
          webhookName: createWebhookName?.trim() || 'Default',
          workflowName: createWorkflowName?.trim() || 'Integrator Workflow',
          participantId: createParticipantId?.trim() || 'webhook',
          timeoutInSeconds: createTimeout,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create webhook');
      const data = await res.json();
      showSuccessToast('Webhook created successfully');
      setShowCreateForm(false);
      setUseDefaultOptions(true);
      onCreated?.();
      if (data.webhookUrl) {
        await navigator.clipboard.writeText(data.webhookUrl);
        showSuccessToast('Webhook URL created and copied to clipboard');
      }
    } catch (err) {
      showErrorToast(err as Error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto flex flex-col w-3/4 sm:max-w-[600px] data-[expanded=true]:w-full data-[expanded=true]:max-w-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </SheetTitle>
          <SheetDescription>
            Create built-in webhook URLs for triggering workflows via HTTP POST. View and delete webhooks from the main connections list.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 py-6 px-6">
          {/* Create new webhook toggle */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <Plus className="h-4 w-4" />
                Create new webhook
              </span>
              {showCreateForm ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showCreateForm && (
              <form onSubmit={handleCreate} className="p-4 pt-4 space-y-6 border-t">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="agentName" className="text-sm font-medium">Agent Name *</Label>
                    <Input
                      id="agentName"
                      value={createAgentName}
                      readOnly
                      className="bg-muted/50 cursor-not-allowed"
                      placeholder="DefaultAgent"
                    />
                    {createErrors.agentName && (
                      <p className="text-sm text-destructive mt-1">{createErrors.agentName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="activationName" className="text-sm font-medium">Activation Name *</Label>
                    <Input
                      id="activationName"
                      value={createActivationName}
                      readOnly
                      className="bg-muted/50 cursor-not-allowed"
                      placeholder="DefaultActivation"
                    />
                    {createErrors.activationName && (
                      <p className="text-sm text-destructive mt-1">{createErrors.activationName}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useDefaultOptions"
                    checked={useDefaultOptions}
                    onCheckedChange={(checked) => setUseDefaultOptions(checked === true)}
                  />
                  <Label
                    htmlFor="useDefaultOptions"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Use Default Options (Recommended)
                  </Label>
                </div>

                {!useDefaultOptions && (
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="webhookName" className="text-sm font-medium">Webhook Name</Label>
                        <Input
                          id="webhookName"
                          value={createWebhookName}
                          onChange={(e) => setCreateWebhookName(e.target.value)}
                          placeholder="Default"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="workflowName" className="text-sm font-medium">Workflow Name</Label>
                        <Input
                          id="workflowName"
                          value={createWorkflowName}
                          onChange={(e) => setCreateWorkflowName(e.target.value)}
                          placeholder="Integrator Workflow"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="participantId" className="text-sm font-medium">Participant ID</Label>
                        <Input
                          id="participantId"
                          value={createParticipantId}
                          onChange={(e) => setCreateParticipantId(e.target.value)}
                          placeholder="webhook"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeout" className="text-sm font-medium">Timeout (seconds)</Label>
                        <Input
                          id="timeout"
                          type="number"
                          min={1}
                          max={300}
                          value={createTimeout}
                          onChange={(e) => setCreateTimeout(parseInt(e.target.value, 10) || 30)}
                        />
                        {createErrors.timeout && (
                          <p className="text-sm text-destructive mt-1">{createErrors.timeout}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Webhook'
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
