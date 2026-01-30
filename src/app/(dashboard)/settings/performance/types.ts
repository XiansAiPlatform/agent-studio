// Date range type
export interface DateRange {
  startDate: string;
  endDate: string;
}

// Metric Categories API Response Types
export interface MetricType {
  type: string;
  sampleCount: number;
  units: string[];
  firstSeen: string;
  lastSeen: string;
  agents: string[];
  sampleValue: number;
}

export interface MetricCategory {
  category: string;
  types: MetricType[];
  totalMetrics: number;
  totalRecords: number;
}

export interface MetricsSummary {
  totalCategories: number;
  totalTypes: number;
  totalRecords: number;
  availableAgents: string[];
  dateRange: DateRange;
}

export interface MetricsCategoriesResponse {
  dateRange: DateRange;
  categories: MetricCategory[];
  summary: MetricsSummary;
}

// Metric Stats API Response Types
export interface MetricStats {
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  median: number | null;
  p95: number | null;
  p99: number | null;
  unit: string;
}

export interface MetricTypeWithStats {
  type: string;
  stats: MetricStats;
}

export interface CategoryWithStats {
  category: string;
  types: MetricTypeWithStats[];
}

export interface ActivationMetricStats {
  activationName: string;
  metricCount: number;
  categoriesAndTypes: CategoryWithStats[];
}

export interface MetricStatsFilters {
  agentName: string | null;
  activationName: string | null;
  participantId: string | null;
  workflowType: string | null;
  model: string | null;
}

export interface MetricStatsResponse {
  period: DateRange;
  filters: MetricStatsFilters;
  summary: {
    totalMetricRecords: number;
    uniqueCategories: number;
    uniqueTypes: number;
    uniqueActivations: number;
    uniqueParticipants: number;
    uniqueWorkflows: number;
    uniqueModels: number;
    dateRange: DateRange;
  };
  categoriesAndTypes: CategoryWithStats[];
  byActivation: ActivationMetricStats[];
}

// Metric Timeseries API Response Types
export interface TimeseriesDataPoint {
  timestamp: string;
  value: number;
  count: number;
  breakdowns: any | null;
}

export interface TimeseriesSummary {
  totalValue: number;
  totalCount: number;
  average: number;
  min: number;
  max: number;
  dataPointCount: number;
}

export interface MetricTimeseriesResponse {
  period: DateRange;
  metric: {
    category: string;
    type: string;
    unit: string;
  };
  filters: MetricStatsFilters;
  groupBy: string;
  aggregation: string;
  dataPoints: TimeseriesDataPoint[];
  summary: TimeseriesSummary;
}

// UI State Types
export interface PerformanceFilters {
  agentName: string | null;
  activationName: string | null;
  startDate: string;
  endDate: string;
}

export type DateRangePreset = 'last7days' | 'last30days' | 'last90days' | 'thisMonth' | 'lastMonth' | 'custom';

// Format helper types
export interface FormattedValue {
  value: string;
  unit: string;
}
