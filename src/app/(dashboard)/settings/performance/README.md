# Performance Metrics Page

## Overview

The Performance page (`/settings/performance`) provides monitoring and visualization of metrics across agent templates and instances. It displays performance data including token usage, operation counts, API latency, and other custom metrics.

## Features

### 1. **Date Range Selection**
- Default: Last month (previous calendar month)
- Presets: Last 7 days, Last 30 days, Last 90 days, This month, Last month
- Automatic URL persistence of selected range

### 2. **Agent Filtering**
- Filter by Agent Template (agentName)
- Filter by Agent Instance (activationName) - *Coming soon*
- Active filter badges with quick removal
- URL persistence of filter state

### 3. **Metrics Overview**
- **Summary Cards**: Quick stats showing total records, metric types, agents, and categories
- **Category Organization**: Metrics grouped by category (AI, Operations, Performance, etc.)
- **Metric Details**: Each metric type shows:
  - Sample count
  - Sample value with formatted units
  - Last seen timestamp
  - Associated agents

### 4. **Future Enhancements**
- Detailed statistics view with charts
- Time-series data visualization
- Agent instance filtering
- Export capabilities

## File Structure

```
performance/
├── page.tsx                    # Main page component with routing and state management
├── types.ts                    # TypeScript type definitions
├── README.md                   # This file
├── components/
│   ├── category-card.tsx       # Expandable category section
│   ├── date-range-picker.tsx   # Date range dropdown selector
│   ├── metric-type-item.tsx    # Individual metric display
│   ├── performance-filters.tsx # Agent template/instance filters
│   └── summary-cards.tsx       # Summary statistics cards
├── hooks/
│   ├── use-metrics-categories.ts  # Hook for categories API
│   └── use-metrics-stats.ts       # Hook for stats API (future use)
└── utils/
    ├── date-helpers.ts         # Date range calculations and formatting
    └── format-helpers.ts       # Metric value formatting utilities
```

## API Endpoints

### 1. Categories Overview
```
GET /api/tenants/{tenantId}/metrics/categories?startDate=...&endDate=...
```

Returns aggregated metrics grouped by category and type.

**Response Structure:**
```typescript
{
  dateRange: { startDate, endDate },
  categories: [
    {
      category: "AI",
      types: [
        {
          type: "Token Usage",
          sampleCount: 27,
          units: ["tokens"],
          firstSeen: "...",
          lastSeen: "...",
          agents: ["Agent 1", "Agent 2"],
          sampleValue: 1998
        }
      ],
      totalMetrics: 1,
      totalRecords: 27
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

### 2. Detailed Statistics (Future)
```
GET /api/tenants/{tenantId}/metrics/stats?agentName=...&startDate=...&endDate=...
```

Returns statistical aggregations (count, sum, avg, min, max, median, p95, p99) for metrics.

### 3. Timeseries Data (Future)
```
GET /api/tenants/{tenantId}/metrics/timeseries?category=...&type=...&agentName=...&startDate=...&endDate=...
```

Returns time-series data points for charting and visualization.

## URL Parameters

The page uses URL parameters to persist state:

- `startDate`: ISO 8601 date string
- `endDate`: ISO 8601 date string
- `agent`: Agent template name
- `activation`: Agent instance/activation name (future)

Example:
```
/settings/performance?agent=Research%20Assistant&startDate=2026-01-01T00:00:00Z&endDate=2026-01-31T23:59:59Z
```

## Usage

### Viewing Metrics
1. Navigate to `/settings/performance`
2. Select a date range using the date picker
3. Optionally filter by agent template
4. Browse metrics organized by category
5. Click "View detailed statistics" to see deeper insights (future feature)

### Filtering by Agent
1. Use the "Agent Template" dropdown to select an agent
2. Metrics will be filtered to show only data from that agent
3. Click the filter badge or "Clear all" to remove filters

## Component Details

### Date Range Picker
- Dropdown with preset options
- Displays formatted date range
- Automatically updates URL on selection

### Summary Cards
- 4-column grid (responsive)
- Icons with color-coded backgrounds
- Compact number formatting (K, M, B)

### Category Card
- Expandable/collapsible sections
- Category emoji icons
- Nested metric type items
- Record count badges

### Metric Type Item
- Metric name and sample count
- Last seen timestamp (relative)
- Sample value with unit formatting
- Agent badges showing contributors
- Future: "View details" button

## Development Notes

### Adding New Metric Categories
1. Add category icon to `CATEGORY_ICONS` in `types.ts`
2. Categories are automatically rendered from API response

### Adding New Date Presets
1. Add preset to `DateRangePreset` type in `types.ts`
2. Add option to `PRESET_OPTIONS` in `date-range-picker.tsx`
3. Implement logic in `getDateRangeFromPreset()` in `date-helpers.ts`

### Formatting Custom Units
1. Add unit mapping in `getUnitDisplay()` in `format-helpers.ts`
2. Add formatting logic in `formatMetricValue()` if special handling needed

## Testing

### Manual Testing Checklist
- [ ] Page loads with default date range (last month)
- [ ] Date range picker changes update the display
- [ ] Agent filter updates metrics shown
- [ ] URL parameters persist on refresh
- [ ] Categories expand/collapse correctly
- [ ] Metric values are formatted with correct units
- [ ] Empty states show when no data available
- [ ] Error states display user-friendly messages
- [ ] Loading states show during API calls

## Future Features

### Phase 2: Detailed Stats View
- Dedicated page for metric statistics
- Aggregate calculations (sum, avg, min, max, median, p95, p99)
- Breakdown by activation
- Comparison capabilities

### Phase 3: Timeseries Visualization
- Interactive charts (line, bar, area)
- Zoom and pan capabilities
- Data export (CSV, JSON)
- Custom date grouping (hour, day, week, month)

### Phase 4: Advanced Filtering
- Agent instance (activation) filtering
- Workflow type filtering
- Participant filtering
- Model filtering
- Multi-select capabilities
