# Performance Metrics Page

## Overview

The Performance page (`/settings/performance`) provides monitoring and visualization of metrics across agent templates and instances. It displays performance data including token usage, operation counts, API latency, and other custom metrics.

## Features

### 1. Date Range Selection
- Default: Last 30 days
- Presets: Last 7 days, Last 30 days, Last 90 days, This month, Last month
- Automatic URL persistence of selected range

### 2. Agent Filtering
- Filter by Agent Template (`agentName`)
- Filter by Agent Instance (`activationName`)
- Active filter badges with quick removal
- URL persistence of filter state

### 3. Metrics Overview
- **Summary Cards**: total records, metric types, categories
- **Category Organization**: metrics grouped by category (AI, Operations, Performance, etc.)
- **Metric Details**: each metric type shows its full statistical breakdown:
  - Total (sum), sample count, units, last seen
  - Average, Min, Max, Median, P95, P99
  - Contributing agents

### 4. Timeline View
- Click "View Timeline" on any metric type (when an agent is selected) to drill into the timeseries chart at `/settings/performance/timeline`.

## File Structure

```
performance/
├── page.tsx                    # Main page: routing, filters, state
├── types.ts                    # Shared TypeScript types
├── README.md                   # This file
├── components/
│   ├── category-card.tsx       # Expandable category section
│   ├── date-range-picker.tsx   # Date range dropdown selector
│   ├── metric-type-item.tsx    # Individual metric display (with stats)
│   ├── performance-filters.tsx # Agent template/instance filters
│   └── summary-cards.tsx       # Summary statistics cards
├── hooks/
│   ├── use-activations.ts          # List of available activations
│   ├── use-metrics-categories.ts   # Categories + embedded stats
│   └── use-metrics-timeseries.ts   # Timeline page data
└── utils/
    ├── date-helpers.ts         # Date range presets and formatting
    └── format-helpers.ts       # Metric value/unit formatting
```

## API Endpoints

### 1. Categories Overview
```
GET /api/metrics/categories?startDate=...&endDate=...&agentName=...&activationName=...
```

Returns metrics grouped by category and type, with full statistics embedded inline for each type.

**Response shape:**
```typescript
{
  dateRange: { startDate, endDate },
  categories: [
    {
      category: "AI",
      types: [
        {
          type: "input",
          sampleCount: 4,
          units: ["tokens"],
          firstSeen: "2026-04-21T18:12:24.254Z",
          lastSeen: "2026-04-22T07:34:19.145Z",
          agents: ["Xianix AI-DLC Agent"],
          sampleValue: 7,
          stats: {
            count: 4,
            sum: 28,
            average: 7,
            min: 5,
            max: 9,
            median: null,
            p95: null,
            p99: null,
            unit: "tokens"
          }
        }
      ],
      totalMetrics: 1,
      totalRecords: 4
    }
  ],
  summary: {
    totalCategories: 3,
    totalTypes: 3,
    totalRecords: 80,
    availableAgents: ["Agent 1", "Agent 2"],
    dateRange: { ... }
  }
}
```

### 2. Timeseries Data
```
GET /api/metrics/timeseries?category=...&type=...&startDate=...&endDate=...&groupBy=day
```

Returns time-bucketed data points for charting on the timeline page.

## URL Parameters

- `startDate`: ISO 8601 date string
- `endDate`: ISO 8601 date string
- `agent`: Agent template name
- `activation`: Agent instance/activation name

Example:
```
/settings/performance?agent=Research%20Assistant&startDate=2026-01-01T00:00:00Z&endDate=2026-01-31T23:59:59Z
```

## Component Details

### Date Range Picker
- Dropdown with preset options
- Displays formatted date range
- Updates URL on selection

### Summary Cards
- Responsive grid (1 / 2 / 3 columns)
- Compact number formatting (K, M, B)

### Category Card
- Expandable/collapsible sections
- Category icon, record count badge

### Metric Type Item
- Headline: total (sum) for the period
- Stats grid: Average · Min · Max · Median · P95 · P99 (null values render as `—`)
- Sample count, units, last-seen timestamp
- Agent badges
- "View Timeline" button when an agent is selected

## Development Notes

### Adding New Date Presets
1. Add the preset key to `DateRangePreset` in `types.ts`
2. Add a `SelectItem` in `date-range-picker.tsx`
3. Implement the range in `getDateRangeFromPreset()` in `utils/date-helpers.ts`

### Formatting Custom Units
1. Add a unit mapping in `getUnitDisplay()` in `utils/format-helpers.ts`
2. Add formatting logic in `formatMetricValue()` if special handling is needed

## Testing

### Manual Testing Checklist
- [ ] Page loads with default date range (last 30 days)
- [ ] Date range picker changes update the display
- [ ] Agent / activation filters update metrics shown
- [ ] URL parameters persist on refresh
- [ ] Categories expand/collapse correctly
- [ ] Stats grid renders all values, with `—` for null percentiles
- [ ] Empty / error / loading states render correctly
- [ ] "View Timeline" navigates to the timeline page with correct params
