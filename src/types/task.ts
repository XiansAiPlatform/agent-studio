// Task domain type.

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'obsolete';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    name: string;
  };
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  conversationId?: string;
  topicId?: string;
  content: {
    originalRequest?: string;
    proposedAction?: string;
    reasoning?: string;
    data?: Record<string, any>;
  };
}
