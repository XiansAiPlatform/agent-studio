import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { formatRelativeTime } from './format-relative-time.ts'

const NOW = new Date('2026-10-23T12:00:00.000Z')

function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString()
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('formatRelativeTime', () => {
  it('shows "just now" for a task created seconds ago (not "1 hour ago")', () => {
    assert.equal(formatRelativeTime(ago(5 * SECOND), 'long', NOW), 'just now')
    assert.equal(formatRelativeTime(ago(5 * SECOND), 'short', NOW), 'just now')
  })

  it('shows minutes for timestamps under an hour old', () => {
    assert.equal(formatRelativeTime(ago(1 * MINUTE), 'long', NOW), '1 minute ago')
    assert.equal(formatRelativeTime(ago(30 * MINUTE), 'long', NOW), '30 minutes ago')
    assert.equal(formatRelativeTime(ago(59 * MINUTE), 'short', NOW), '59m ago')
  })

  it('shows hours for timestamps under a day old', () => {
    assert.equal(formatRelativeTime(ago(61 * MINUTE), 'long', NOW), '1 hour ago')
    assert.equal(formatRelativeTime(ago(2 * HOUR), 'short', NOW), '2h ago')
  })

  it('does not round days up', () => {
    assert.equal(formatRelativeTime(ago(25 * HOUR), 'long', NOW), '1 day ago')
    assert.equal(formatRelativeTime(ago(3 * DAY), 'short', NOW), '3d ago')
  })

  it('formats future timestamps', () => {
    assert.equal(formatRelativeTime(ago(-2 * HOUR), 'long', NOW), 'in 2 hours')
    assert.equal(formatRelativeTime(ago(-2 * DAY), 'short', NOW), 'in 2d')
  })

  it('treats UTC timestamps from the server correctly', () => {
    assert.equal(formatRelativeTime('2026-10-23T11:55:00Z', 'long', NOW), '5 minutes ago')
  })

  it('returns an empty string for invalid input', () => {
    assert.equal(formatRelativeTime('not-a-date', 'long', NOW), '')
  })
})
