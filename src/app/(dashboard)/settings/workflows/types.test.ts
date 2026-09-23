import { describe, expect, it } from 'vitest'
import { isRunningWorkflow, workflowLogsHref } from './types'

describe('workflow helpers', () => {
  it('isRunningWorkflow is true only for Running (case-insensitive)', () => {
    expect(isRunningWorkflow('Running')).toBe(true)
    expect(isRunningWorkflow('running')).toBe(true)
    expect(isRunningWorkflow('Completed')).toBe(false)
    expect(isRunningWorkflow(null)).toBe(false)
  })

  it('workflowLogsHref uses logs query param names', () => {
    expect(
      workflowLogsHref('My Agent', 'prod', 'tenant:My Agent:Chat:prod')
    ).toBe(
      '/settings/logs?agent=My+Agent&activation=prod&workflowId=tenant%3AMy+Agent%3AChat%3Aprod'
    )
  })
})
