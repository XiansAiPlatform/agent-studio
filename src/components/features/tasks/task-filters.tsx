export type TaskStatus = 'pending' | 'approved' | 'rejected' | 'obsolete';
export type TaskScope = 'my-tasks' | 'all-tasks';

export interface TaskFilters {
  scope: TaskScope;
  statuses: TaskStatus[];
  agents: string[];
}
