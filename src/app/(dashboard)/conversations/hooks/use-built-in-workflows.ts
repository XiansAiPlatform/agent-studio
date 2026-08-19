import { useEffect, useMemo, useState } from 'react';
import {
  listBuiltInWorkflows,
  type WorkflowDefinitionLike,
} from '@/lib/xians/built-in-workflows';

async function fetchBuiltInWorkflowsForAgent(agentName: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}`);
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    const definitions: WorkflowDefinitionLike[] = Array.isArray(data.definitions)
      ? data.definitions
      : [];
    return listBuiltInWorkflows(definitions);
  } catch {
    return [];
  }
}

/**
 * Loads each agent's flow definitions and returns only built-in workflow names.
 * Does not invent Supervisor Workflow while definitions are still loading.
 */
export function useBuiltInWorkflows(agentNames: string[]) {
  const namesKey = [...agentNames].sort().join('\0');
  const [workflowsByAgent, setWorkflowsByAgent] = useState<Record<string, string[]>>(
    {}
  );

  useEffect(() => {
    if (agentNames.length === 0) {
      setWorkflowsByAgent({});
      return;
    }

    let cancelled = false;

    const load = async () => {
      const entries = await Promise.all(
        agentNames.map(async (name) => {
          const listed = await fetchBuiltInWorkflowsForAgent(name);
          return [name, listed] as const;
        })
      );
      if (!cancelled) {
        setWorkflowsByAgent(Object.fromEntries(entries));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [namesKey]);

  const isLoading = useMemo(
    () =>
      agentNames.length > 0 && agentNames.some((name) => !(name in workflowsByAgent)),
    [agentNames, workflowsByAgent]
  );

  return { workflowsByAgent, isLoading };
}
