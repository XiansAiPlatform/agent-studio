export type LogLevel = 'Error' | 'Warning' | 'Information' | 'Info' | 'Debug' | 'Trace';

export interface LogEntry {
  id: string;
  tenantId: string;
  createdAt: string;
  level: LogLevel;
  message: string;
  workflowId: string;
  workflowRunId: string | null;
  workflowType: string;
  agent: string;
  activation: string | null;
  participantId: string | null;
  properties: Record<string, any> | null;
  exception: string | null;
  updatedAt: string | null;
}

export interface LogsResponse {
  logs: LogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LogFilters {
  agentName?: string;
  activationName?: string;
  workflowId?: string;
  workflowType?: string;
  logLevel?: LogLevel[];
  startDate?: string; // ISO 8601
  endDate?: string;   // ISO 8601
  page?: number;
  pageSize?: number;
}

export interface ActivationWithAgent {
  activationName: string;
  agentName: string;
  isActive?: boolean;
}

export interface SelectedActivation {
  activationName: string;
  agentName: string;
}

export interface LogStream {
  workflowId: string;
  workflowType: string | null;
  workflowRunId: string | null;
  agent: string;
  activation: string | null;
  participantId: string | null;
  firstLogAt: string;
  lastLogAt: string;
  logCount: number;
  lastLogLevel: LogLevel;
  lastLogMessage: string;
}

export interface LogStreamsResponse {
  streams: LogStream[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LogStreamFilters {
  agentName?: string;
  activationName?: string;
  workflowType?: string;
  logLevel?: LogLevel[];
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
