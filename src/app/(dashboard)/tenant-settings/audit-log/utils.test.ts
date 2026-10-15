import { describe, expect, it } from 'vitest';
import type { AuditLogFilters } from './types';
import {
  buildApiFilterQuery,
  buildFilterQuery,
  normalizeDateTimeLocal,
  parseUtcTimestamp,
} from './utils';

function filters(overrides: Partial<AuditLogFilters> = {}): AuditLogFilters {
  return {
    performedBy: null,
    actions: [],
    activationName: null,
    onlyWithoutActivation: false,
    startDate: null,
    endDate: null,
    ...overrides,
  };
}

describe('normalizeDateTimeLocal', () => {
  it('returns null for missing or unusable values', () => {
    expect(normalizeDateTimeLocal(null, 'start')).toBeNull();
    expect(normalizeDateTimeLocal('', 'start')).toBeNull();
    expect(normalizeDateTimeLocal('not-a-date', 'end')).toBeNull();
  });

  it('expands legacy date-only values to day boundaries', () => {
    expect(normalizeDateTimeLocal('2026-10-01', 'start')).toBe('2026-10-01T00:00:00');
    expect(normalizeDateTimeLocal('2026-10-01', 'end')).toBe('2026-10-01T23:59:59');
  });

  it('keeps seconds when present', () => {
    expect(normalizeDateTimeLocal('2026-10-01T09:30:45', 'start')).toBe('2026-10-01T09:30:45');
    expect(normalizeDateTimeLocal('2026-10-01T09:30:45', 'end')).toBe('2026-10-01T09:30:45');
  });

  it('pads minute-precision values (browser omits :00, legacy URLs) with :00', () => {
    expect(normalizeDateTimeLocal('2026-10-01T09:30', 'start')).toBe('2026-10-01T09:30:00');
    expect(normalizeDateTimeLocal('2026-10-01T09:30', 'end')).toBe('2026-10-01T09:30:00');
  });
});

describe('buildApiFilterQuery', () => {
  it('converts start to the beginning of its second in UTC', () => {
    const q = buildApiFilterQuery(filters({ startDate: '2026-10-01T09:30:15' }));
    expect(q.get('startDate')).toBe(new Date('2026-10-01T09:30:15').toISOString());
    expect(q.get('startDate')).toMatch(/:15\.000Z$/);
  });

  it('converts end to the last millisecond of its second in UTC', () => {
    const q = buildApiFilterQuery(filters({ endDate: '2026-10-01T09:30:45' }));
    const expected = new Date('2026-10-01T09:30:45');
    expected.setMilliseconds(999);
    expect(q.get('endDate')).toBe(expected.toISOString());
    expect(q.get('endDate')).toMatch(/:45\.999Z$/);
  });

  it('treats minute-precision values as the :00 second', () => {
    const q = buildApiFilterQuery(
      filters({ startDate: '2026-10-01T09:30', endDate: '2026-10-01T09:30' })
    );
    expect(q.get('startDate')).toMatch(/:00\.000Z$/);
    expect(q.get('endDate')).toMatch(/:00\.999Z$/);
  });

  it('treats legacy date-only URLs as 00:00:00 and 23:59:59.999 local', () => {
    const q = buildApiFilterQuery(filters({ startDate: '2026-10-01', endDate: '2026-10-01' }));
    const end = new Date('2026-10-01T23:59:59');
    end.setMilliseconds(999);
    expect(q.get('startDate')).toBe(new Date('2026-10-01T00:00:00').toISOString());
    expect(q.get('endDate')).toBe(end.toISOString());
  });

  it('omits invalid dates', () => {
    const q = buildApiFilterQuery(filters({ startDate: 'garbage', endDate: '2026-13-45' }));
    expect(q.has('startDate')).toBe(false);
    expect(q.has('endDate')).toBe(false);
  });
});

describe('buildFilterQuery -> buildApiFilterQuery', () => {
  const f = filters({
    performedBy: 'alice@example.com',
    actions: ['user.role.changed', 'user.tenant.added'],
    activationName: 'prod',
    startDate: '2026-10-01T09:30:15',
    endDate: '2026-10-02T18:45:50',
  });

  it('keeps local dates and comma-joined actions in the page URL query', () => {
    const q = buildFilterQuery(f);
    expect(q.get('action')).toBe('user.role.changed,user.tenant.added');
    expect(q.get('startDate')).toBe('2026-10-01T09:30:15');
    expect(q.get('endDate')).toBe('2026-10-02T18:45:50');
  });

  it('only replaces the dates for the API query', () => {
    const page = buildFilterQuery(f);
    const api = buildApiFilterQuery(f);
    for (const key of ['performedBy', 'action', 'activationName']) {
      expect(api.get(key)).toBe(page.get(key));
    }
    expect(api.get('startDate')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:15\.000Z$/);
    expect(api.get('endDate')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:50\.999Z$/);
  });
});

describe('parseUtcTimestamp', () => {
  it('treats timestamps without a zone as UTC', () => {
    expect(parseUtcTimestamp('2026-10-01T09:30:00').toISOString()).toBe('2026-10-01T09:30:00.000Z');
  });

  it('respects explicit zones', () => {
    expect(parseUtcTimestamp('2026-10-01T09:30:00Z').toISOString()).toBe('2026-10-01T09:30:00.000Z');
    expect(parseUtcTimestamp('2026-10-01T09:30:00+05:30').toISOString()).toBe(
      '2026-10-01T04:00:00.000Z'
    );
  });

  it('returns an invalid date for garbage', () => {
    expect(Number.isNaN(parseUtcTimestamp('nope').getTime())).toBe(true);
  });
});
