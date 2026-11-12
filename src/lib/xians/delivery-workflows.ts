/**
 * Workflows of one webhook delivery.
 *
 * The server gives each webhook call its own receiving workflow,
 * `tenant:agent:Integrator Workflow:activation:requestId` (activation empty when there is none), and
 * the agent keys the run it starts by the same request ID:
 * `tenant:agent:Processing Workflow[:activation]:requestId`.
 */

export const DELIVERY_RECEIVING_WORKFLOW_TYPE = 'Integrator Workflow'
export const DELIVERY_RUN_WORKFLOW_TYPE = 'Processing Workflow'

// Request IDs are GUIDs. Requiring one keeps an activation name with a colon from being read as a delivery.
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The workflow ID, plus the run it started when it is a delivery's own receiving workflow. Any other
 * ID, including the receiving workflow deliveries shared before, is returned on its own.
 */
export function withDeliveryRun(workflowId: string): string[] {
  const [tenant, agent, type, ...rest] = workflowId.split(':')
  const requestId = rest[rest.length - 1]
  if (!tenant || !agent || type !== DELIVERY_RECEIVING_WORKFLOW_TYPE || rest.length < 2 || !REQUEST_ID_PATTERN.test(requestId)) {
    return [workflowId]
  }
  return [workflowId, [tenant, agent, DELIVERY_RUN_WORKFLOW_TYPE, ...rest.filter(Boolean)].join(':')]
}
