export interface DataSchemaResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  filters: {
    agentName: string;
    activationName: string;
  };
  types: string[];
}

export interface DataRecord {
  id: string;
  key: string;
  participantId: string;
  content: Record<string, any>;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt?: string | null;
  expiresAt?: string | null;
}

export interface DataResponse {
  data: DataRecord[];
  total: number;
  skip: number;
  limit: number;
}

export interface DateRange {
  label: string;
  value: string;
  startDate: string;
  endDate: string;
}

export const DATE_RANGES: DateRange[] = [
  {
    label: 'Last 7 days',
    value: '7d',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  },
  {
    label: 'Last 30 days',
    value: '30d',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  },
  {
    label: 'Last 3 months',
    value: '3m',
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  },
  {
    label: 'Last 6 months',
    value: '6m',
    startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  },
  {
    label: 'Last 12 months',
    value: '12m',
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  },
];