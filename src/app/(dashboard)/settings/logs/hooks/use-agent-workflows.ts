import { useEffect, useState } from 'react';
import { AgentWorkflowOption, shortWorkflowName } from '../types';

interface AgentDefinition {
  workflowType?: string;
  name?: string | null;
}

// Workflow definitions rarely change while the page is open; cache per agent so
// re-opening the filter slider doesn't refetch.
const cache = new Map<string, AgentWorkflowOption[]>();

function toOptions(agentName: string, definitions: AgentDefinition[]): AgentWorkflowOption[] {
  const seen = new Set<string>();
  const options: AgentWorkflowOption[] = [];
  for (const def of definitions) {
    if (!def.workflowType || seen.has(def.workflowType)) continue;
    seen.add(def.workflowType);
    options.push({
      workflowType: def.workflowType,
      name: def.name || shortWorkflowName(def.workflowType, agentName),
    });
  }
  return options.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Loads the workflows registered on an agent (its flow definitions), used to
 * populate the workflow level of the log filter tree. All definitions are
 * included, not just activable ones, because child and task workflows log too.
 */
export function useAgentWorkflows(agentName: string | null | undefined) {
  // Agent whose fetch has settled (successfully or not) - drives isLoading.
  const [settledAgent, setSettledAgent] = useState<string | null>(null);

  useEffect(() => {
    if (!agentName || cache.has(agentName)) return;

    const controller = new AbortController();
    fetch(`/api/agents/${encodeURIComponent(agentName)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to fetch agent workflows: ${response.status}`);
        return response.json();
      })
      .then((data: { definitions?: AgentDefinition[] }) => {
        cache.set(agentName, toOptions(agentName, data.definitions ?? []));
        setSettledAgent(agentName);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('[useAgentWorkflows] Error fetching agent workflows:', error);
        setSettledAgent(agentName);
      });

    return () => controller.abort();
  }, [agentName]);

  const workflows = (agentName && cache.get(agentName)) || [];
  const isLoading = Boolean(agentName) && !cache.has(agentName!) && settledAgent !== agentName;

  return { workflows, isLoading };
}
