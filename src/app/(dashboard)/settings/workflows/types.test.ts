import { describe, expect, it } from 'vitest'
import {
  collectWorkflowTypeFilterOptions,
  isRunningWorkflow,
  matchesWorkflowType,
  toShortWorkflowType,
  workflowLogsHref,
} from './types'

describe('workflow helpers', () => {
  it('isRunningWorkflow is true only for Running (case-insensitive)', () => {
    expect(isRunningWorkflow('Running')).toBe(true)
    expect(isRunningWorkflow('running')).toBe(true)
    expect(isRunningWorkflow('Completed')).toBe(false)
    expect(isRunningWorkflow(null)).toBe(false)
  })

  it('workflowLogsHref preselects the workflow type filter when known', () => {
    expect(
      workflowLogsHref('My Agent', 'prod', 'tenant:My Agent:Chat:prod', 'My Agent:Chat')
    ).toBe(
      '/settings/logs?agent=My+Agent&activation=prod&workflowId=tenant%3AMy+Agent%3AChat%3Aprod&workflowType=My+Agent%3AChat'
    )
  })

  it('workflowLogsHref uses logs query param names', () => {
    expect(
      workflowLogsHref('My Agent', 'prod', 'tenant:My Agent:Chat:prod')
    ).toBe(
      '/settings/logs?agent=My+Agent&activation=prod&workflowId=tenant%3AMy+Agent%3AChat%3Aprod'
    )
  })

  it('toShortWorkflowType strips the agent prefix', () => {
    expect(toShortWorkflowType('Support Bot:Supervisor Workflow', 'Support Bot')).toBe(
      'Supervisor Workflow'
    )
    expect(toShortWorkflowType('Custom Type', 'Support Bot')).toBe('Custom Type')
    expect(toShortWorkflowType(null, 'Support Bot')).toBe('')
  })

  it('matchesWorkflowType compares short names for prefixed and custom types', () => {
    const supervisor = { agent: 'Support Bot', workflowType: 'Support Bot:Supervisor Workflow' }
    const custom = { agent: 'Support Bot', workflowType: 'Invoice Flow' }
    expect(matchesWorkflowType(supervisor, 'Support Bot', 'Supervisor Workflow')).toBe(true)
    expect(matchesWorkflowType(supervisor, 'Support Bot', 'Task Workflow')).toBe(false)
    expect(matchesWorkflowType(custom, 'Support Bot', 'Invoice Flow')).toBe(true)
    expect(matchesWorkflowType(custom, 'Support Bot', undefined)).toBe(true)
  })

  it('collectWorkflowTypeFilterOptions includes builtins and discovered types', () => {
    expect(
      collectWorkflowTypeFilterOptions('Support Bot', [
        { agent: 'Support Bot', workflowType: 'Support Bot:Supervisor Workflow' },
        { agent: 'Support Bot', workflowType: 'Support Bot:Invoice Flow' },
      ])
    ).toEqual(['Supervisor Workflow', 'Task Workflow', 'Invoice Flow'])
  })
})
