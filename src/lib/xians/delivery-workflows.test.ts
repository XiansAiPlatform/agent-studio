import { describe, expect, it } from 'vitest'
import { withDeliveryRun } from './delivery-workflows'

const REQUEST_ID = 'd960231d-93fc-41bc-b9ac-5db2c31ed199'

describe('withDeliveryRun', () => {
  it("adds the run a delivery's receiving workflow started", () => {
    expect(
      withDeliveryRun(
        `test-diyanada:Xianix AI-DLC Agent Onboarding:Integrator Workflow:Xianix AI-DLC Agent Onboarding - Autonomous Raven:${REQUEST_ID}`
      )
    ).toEqual([
      `test-diyanada:Xianix AI-DLC Agent Onboarding:Integrator Workflow:Xianix AI-DLC Agent Onboarding - Autonomous Raven:${REQUEST_ID}`,
      `test-diyanada:Xianix AI-DLC Agent Onboarding:Processing Workflow:Xianix AI-DLC Agent Onboarding - Autonomous Raven:${REQUEST_ID}`,
    ])
  })

  it('leaves the empty activation segment out of the run ID', () => {
    expect(withDeliveryRun(`t:Agent:Integrator Workflow::${REQUEST_ID}`)).toEqual([
      `t:Agent:Integrator Workflow::${REQUEST_ID}`,
      `t:Agent:Processing Workflow:${REQUEST_ID}`,
    ])
  })

  it.each([
    ['the receiving workflow deliveries shared before', 't:Agent:Integrator Workflow:Raven'],
    ['an activation whose last part is not a request ID', 't:Agent:Integrator Workflow:env:prod'],
    ['another workflow type', `t:Agent:Processing Workflow:Raven:${REQUEST_ID}`],
    ['an ID of another shape', 'Integrator Workflow'],
  ])('returns only the ID for %s', (_, workflowId) => {
    expect(withDeliveryRun(workflowId)).toEqual([workflowId])
  })
})
