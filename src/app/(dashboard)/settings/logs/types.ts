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

/** A workflow registered on an agent, used as the third filter level (agent → activation → workflow). */
export interface AgentWorkflowOption {
  /** Full Temporal workflow type, e.g. `Support Bot:Supervisor Workflow`. Sent as the `workflowType` filter. */
  workflowType: string;
  /** Display name, e.g. `Supervisor Workflow`. */
  name: string;
}

/** Strips the `{agentName}:` prefix from a workflow type for display. */
export function shortWorkflowName(workflowType: string, agentName?: string): string {
  if (agentName && workflowType.startsWith(`${agentName}:`)) {
    return workflowType.slice(agentName.length + 1);
  }
  return workflowType;
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
  /**
   * Number of Error/Critical logs in this stream. Used to flag streams that
   * contain errors anywhere in their history, not only when the latest log is
   * an error. May be absent from older API responses (treated as 0).
   */
  errorCount?: number;
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
