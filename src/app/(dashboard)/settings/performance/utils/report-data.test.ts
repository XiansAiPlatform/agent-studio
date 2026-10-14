import { describe, expect, it } from 'vitest';
import { MetricsCategoriesResponse, MetricType } from '../types';
import {
  buildReportSections,
  formatStatCell,
  getReportFileName,
  REPORT_COLUMNS,
} from './report-data';

function makeType(overrides: Partial<MetricType> = {}): MetricType {
  return {
    type: 'estimated_cost',
    sampleCount: 1,
    units: ['usd'],
    firstSeen: '2026-08-10T09:00:00Z',
    lastSeen: '2026-08-12T12:00:00',
    agents: ['Xianix AI-DLC Template'],
    sampleValue: 0.01,
    stats: {
      count: 1,
      sum: 0.01,
      average: 0.01,
      min: 0.01,
      max: 0.01,
      median: null,
      p95: null,
      p99: null,
      unit: 'usd',
    },
    ...overrides,
  };
}

function makeResponse(types: MetricType[]): MetricsCategoriesResponse {
  return {
    dateRange: { startDate: '2026-09-14', endDate: '2026-10-14' },
    categories: [
      { category: 'chat-conversations', types, totalMetrics: types.length, totalRecords: 4 },
    ],
    summary: {
      totalCategories: 1,
      totalTypes: types.length,
      totalRecords: 4,
      availableAgents: [],
      dateRange: { startDate: '2026-09-14', endDate: '2026-10-14' },
    },
  };
}

describe('formatStatCell', () => {
  it('renders null as a dash', () => {
    expect(formatStatCell(null, 'usd')).toBe('—');
  });

  it('appends the display unit', () => {
    expect(formatStatCell(0.01, 'usd')).toBe('0.01 usd');
    expect(formatStatCell(250, 'milliseconds')).toBe('250 ms');
  });

  it('keeps the count unit, matching the page', () => {
    expect(formatStatCell(3, 'count')).toBe('3 count');
  });
});

describe('buildReportSections', () => {
  it('creates one section per category with rows in column order', () => {
    const [section] = buildReportSections(makeResponse([makeType()]));

    expect(section.category).toBe('chat-conversations');
    expect(section.totalRecords).toBe(4);
    expect(section.rows).toEqual([
      [
        'estimated_cost',
        '1',
        '0.01 usd',
        '0.01 usd',
        '0.01 usd',
        '0.01 usd',
        '—',
        '—',
        '—',
        'Xianix AI-DLC Template',
        '2026-08-12',
      ],
    ]);
    expect(section.rows[0]).toHaveLength(REPORT_COLUMNS.length);
  });

  it('joins multiple agents and shows a dash when there are none', () => {
    const [section] = buildReportSections(
      makeResponse([
        makeType({ agents: ['Agent A', 'Agent B'] }),
        makeType({ type: 'failed', agents: [] }),
      ])
    );

    expect(section.rows[0][9]).toBe('Agent A, Agent B');
    expect(section.rows[1][9]).toBe('—');
  });
});

describe('getReportFileName', () => {
  it('uses the date range', () => {
    expect(getReportFileName('2026-09-14T00:00:00', '2026-10-14T23:59:59')).toBe(
      'performance-report_2026-09-14_2026-10-14.pdf'
    );
  });
});
