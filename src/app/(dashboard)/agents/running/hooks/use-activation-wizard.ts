import { useState, useCallback } from 'react';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import type { ActivationWizardData } from '@/components/features/agents/activation-config-wizard';
import type { Agent } from '../types';

interface WorkflowDefinition {
  id: string;
  workflowType: string;
  name: string | null;
  summary?: string | null;
  parameterDefinitions: Array<{ name: string; type?: string; description?: string; optional?: boolean }>;
  activable?: boolean;
}

interface AgentApiResponse {
  agent: { id: string; name: string; description: string | null };
  definitions: WorkflowDefinition[];
}

interface ActivationApiResponse {
  id: string;
  workflowConfiguration?: {
    workflows?: Array<{
      workflowType: string;
      inputs?: Array< { name: string; value: string }>;
    }>;
  };
}

export function useActivationWizard(
  currentTenantId: string | null,
  options: {
    onClose: () => void;
    onSuccess: () => Promise<void>;
  }
) {
  const { onClose, onSuccess } = options;

  const [showActivationWizard, setShowActivationWizard] = useState(false);
  const [wizardData, setWizardData] = useState<ActivationWizardData | null>(null);
  const [isLoadingWizard, setIsLoadingWizard] = useState(false);
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, Record<string, string>>>({});
  const [isActivating, setIsActivating] = useState(false);
  const [currentActivationId, setCurrentActivationId] = useState<string | null>(null);

  const handleActivateClick = useCallback(
    async (agent: Agent) => {
      if (!currentTenantId) {
        showErrorToast(new Error('No tenant selected'), 'Failed to activate agent');
        return;
      }

      onClose();
      setIsLoadingWizard(true);

      try {
        const response = await fetch(
          `/api/agents/${encodeURIComponent(agent.template)}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch agent deployment details');
        }

        const data: AgentApiResponse = await response.json();

        const workflowsWithParams = data.definitions
          .filter((def) => def.activable === true)
          .map((def) => ({
            id: def.id,
            workflowType: def.workflowType,
            name: def.name,
            summary: def.summary,
            parameterDefinitions: (def.parameterDefinitions || []).map((p) => ({
              name: p.name,
              type: p.type ?? 'string',
              description: p.description,
              optional: p.optional,
            })),
            activable: def.activable,
          }));

        let existingInputs: Record<string, Record<string, string>> = {};

        try {
          const activationResponse = await fetch('/api/agent-activations');
          if (activationResponse.ok) {
            const activations = await activationResponse.json();
            const currentActivation: ActivationApiResponse | undefined = Array.isArray(
              activations
            )
              ? activations.find((a: ActivationApiResponse) => a.id === agent.id)
              : null;

            if (currentActivation?.workflowConfiguration?.workflows) {
              currentActivation.workflowConfiguration.workflows.forEach(
                (workflow) => {
                  if (workflow.inputs && Array.isArray(workflow.inputs)) {
                    existingInputs[workflow.workflowType] = {};
                    workflow.inputs.forEach((input) => {
                      existingInputs[workflow.workflowType][input.name] =
                        input.value;
                    });
                  }
                }
              );
            }
          }
        } catch {
          // Ignore pre-population errors; wizard will use empty inputs
        }

        setWizardData({
          agent: {
            id: data.agent.id,
            name: data.agent.name,
            description: data.agent.description,
          },
          workflows: workflowsWithParams,
        });
        setCurrentActivationId(agent.id);
        setWorkflowInputs(existingInputs);
        setShowActivationWizard(true);
      } catch (error) {
        showErrorToast(error, 'Failed to load activation wizard');
      } finally {
        setIsLoadingWizard(false);
      }
    },
    [currentTenantId, onClose]
  );

  const handleConfigWizardComplete = useCallback(
    async (inputs: Record<string, Record<string, string>>) => {
      if (!currentTenantId || !wizardData || !currentActivationId) return;

      setIsActivating(true);
      try {
        const workflows = wizardData.workflows.map((workflow) => {
          const workflowInputs = inputs[workflow.workflowType] || {};
          const validParamNames = new Set(
            workflow.parameterDefinitions.map((param) => param.name)
          );

          const filteredInputs = Object.entries(workflowInputs)
            .filter(([name]) => validParamNames.has(name))
            .map(([name, value]) => ({ name, value }));

          return {
            workflowType: workflow.workflowType,
            inputs: filteredInputs,
          };
        });

        const response = await fetch(
          `/api/agent-activations/${currentActivationId}/activate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workflowConfiguration: { workflows } }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw {
            status: response.status,
            message:
              errorData.error ||
              errorData.message ||
              'Failed to activate agent',
            error: errorData.error,
            details: errorData.details,
          };
        }

        showSuccessToast(
          'Agent Activated Successfully',
          `${wizardData.agent.name} is now active and ready to use`
        );

        setShowActivationWizard(false);
        setWizardData(null);
        setWorkflowInputs({});
        setCurrentActivationId(null);
        onClose();
        await onSuccess();
      } catch (error) {
        showErrorToast(error, 'Failed to activate agent');
      } finally {
        setIsActivating(false);
      }
    },
    [currentTenantId, wizardData, currentActivationId, onClose, onSuccess]
  );

  const handleWizardCancel = useCallback(() => {
    setShowActivationWizard(false);
    setWizardData(null);
    setWorkflowInputs({});
    setCurrentActivationId(null);
  }, []);

  return {
    showActivationWizard,
    setShowActivationWizard,
    wizardData,
    isLoadingWizard,
    workflowInputs,
    isActivating,
    handleActivateClick,
    handleConfigWizardComplete,
    handleWizardCancel,
  };
}
