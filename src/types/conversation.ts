// Conversation domain types (Message, Topic, Conversation).

/** Message type for rendering. 'chat' is default; 'tool' and 'reasoning' for agent sub-types. */
export type MessageType = 'chat' | 'tool' | 'reasoning';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'agent' | 'system';
  /** Optional type for routing to ChatMessageItem, ToolMessageItem, or ReasoningMessageItem */
  messageType?: MessageType;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  taskId?: string; // Associated task ID for the message
  /** Routing context for feedback API (from Xians history) */
  threadId?: string;
  workflowId?: string;
  workflowType?: string;
  participantId?: string;
  /** Embedded human feedback from history API */
  feedback?: {
    starRating: number;
    reasonCategory?: string;
    comment?: string;
    submittedBy?: string;
    submittedAt?: string;
  };
  attachments?: {
    type: 'task' | 'file' | 'link';
    id: string;
    name: string;
    /** Storage id for file attachments backed by server (GridFS) storage. */
    fileId?: string;
    /** Download URL for the attachment, when available. */
    url?: string;
  }[];
  contentDraft?: {
    id: string;
    title: string;
    content: string;
    type: 'email' | 'response' | 'document' | 'recommendation' | 'analysis';
    taskId?: string; // Associated task ID for editing
    metadata?: {
      subject?: string;
      recipients?: string[];
      [key: string]: any;
    };
  };
}

export interface Topic {
  id: string;
  name: string;
  createdAt: string;
  status: 'active' | 'resolved' | 'archived';
  messages: Message[];
  associatedTasks?: string[]; // Task IDs
  isDefault?: boolean;
  messageCount?: number; // Total count from API, not affected by lazy loading
  lastMessageAt?: string; // Last message timestamp from API
}

export interface Conversation {
  id: string;
  tenantId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  agent: {
    id: string;
    name: string;
    avatar?: string;
    status: 'online' | 'offline' | 'busy';
  };
  startTime: string;
  lastActivity: string;
  topics: Topic[];
  status: 'active' | 'inactive' | 'archived';
}
