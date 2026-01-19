/**
 * Xians Server API Types
 * 
 * Type definitions for Xians server API requests and responses
 */

// Tenant types
export interface XiansTenant {
  tenantId: string
  name: string
  domain: string
  description?: string
  logo?: {
    url?: string
    imgBase64?: string
    width?: number
    height?: number
  }
  theme?: string
  timezone?: string
  enabled?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateTenantRequest {
  tenantId: string
  name: string
  domain: string
  description?: string
  logo?: {
    url?: string
    imgBase64?: string
    width?: number
    height?: number
  }
  theme?: string
  timezone?: string
}

export interface UpdateTenantRequest {
  name?: string
  domain?: string
  description?: string
  logo?: {
    url?: string
    imgBase64?: string
    width?: number
    height?: number
  }
  theme?: string
  timezone?: string
  enabled?: boolean
}

export interface XiansUserTenantAccess {
  tenantId: string
  userId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  permissions: string[]
  grantedAt: string
}

// Agent types
export interface XiansAgent {
  id: string
  tenantId: string
  name: string
  description?: string
  type: string
  status: 'active' | 'inactive'
  config: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface CreateAgentRequest {
  name: string
  description?: string
  type: string
  config?: Record<string, any>
}

// Agent Template types
export interface XiansAgentTemplateAgent {
  id: string
  name: string
  tenant: string | null
  createdBy: string
  createdAt: string
  ownerAccess: string[]
  readAccess: string[]
  writeAccess: string[]
  systemScoped: boolean
  onboardingJson: any | null
  description: string | null
  summary: string | null
  version: string | null
  author: string | null
}

export interface XiansAgentTemplateDefinition {
  id: string
  workflowType: string
  agent: string
  name: string | null
  hash: string
  source: string
  markdown: string
  activityDefinitions: any[]
  parameterDefinitions: Array<{
    name: string
    type: string
    description?: string
    optional?: boolean
  }>
  createdAt: string
  updatedAt: string
  createdBy: string
  tenant: string | null
  systemScoped: boolean
  activable?: boolean
  summary?: string | null
  onboardingJson?: any | null
}

export interface XiansAgentTemplate {
  agent: XiansAgentTemplateAgent
  definitions: XiansAgentTemplateDefinition[]
}

// Agent Deployment types
export interface XiansAgentDeployment {
  id: string
  tenant: string
  createdBy: string
  createdAt: string
  ownerAccess: string[]
  readAccess: string[]
  writeAccess: string[]
  systemScoped: boolean
  onboardingJson: any | null
  name: string
  description: string | null
  summary: string | null
  version: string | null
  author: string | null
  updatedAt?: string
  status?: 'active' | 'inactive' | 'suspended'
  config?: Record<string, any>
}

export interface XiansAgentDeploymentsResponse {
  agents: XiansAgentDeployment[]
  pagination: {
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export interface XiansAgentDeploymentDetail {
  agent: {
    id: string
    name: string
    tenant: string
    createdBy: string
    createdAt: string
    ownerAccess: string[]
    readAccess: string[]
    writeAccess: string[]
    systemScoped: boolean
    onboardingJson: any | null
    description: string | null
    summary: string | null
    version: string | null
    author: string | null
  }
  definitions: Array<{
    id: string
    workflowType: string
    agent: string
    name: string | null
    hash: string
    source: string
    markdown: string
    activityDefinitions: any[]
    parameterDefinitions: Array<{
      name: string
      type: string
      description?: string
      optional?: boolean
    }>
    createdAt: string
    updatedAt: string
    createdBy: string
    tenant: string
    systemScoped: boolean
    activable?: boolean
    summary?: string | null
    onboardingJson?: any | null
  }>
}

// Agent Activation types
export interface XiansAgentActivation {
  id: string
  tenant: string
  name: string
  agentName: string
  description?: string
  participantId?: string
  workflowConfiguration?: {
    workflows: Array<{
      workflowType: string
      inputs?: Array<{
        name: string
        value: string
      }>
    }>
  }
  status?: 'active' | 'inactive'
  createdAt: string
  updatedAt?: string
  createdBy: string
}

export interface CreateAgentActivationRequest {
  name: string
  agentName: string
  description?: string
  participantId?: string
  workflowConfiguration?: {
    workflows: Array<{
      workflowType: string
      inputs?: Array<{
        name: string
        value: string
      }>
    }>
  }
}

// Conversation types
export interface XiansConversation {
  id: string
  tenantId: string
  agentId: string
  userId: string
  status: 'active' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}

// Messaging/Topic types
export interface XiansTopic {
  scope: string | null  // null scope represents "General Discussions"
  lastMessageAt?: string
  messageCount?: number
}

export interface XiansTopicsResponse {
  topics: XiansTopic[]
  pagination: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

// Message History types
export interface XiansMessage {
  id: string
  threadId: string
  requestId: string
  tenantId: string
  createdAt: string
  updatedAt: string
  createdBy: string
  direction: 'Incoming' | 'Outgoing'
  text: string
  status: string | null
  data: any
  participantId: string
  scope: string | null
  hint: string | null
  workflowId: string
  workflowType: string
  messageType: string
  origin: string | null
}

export interface XiansMessageHistoryParams {
  tenantId: string
  agentName: string
  activationName: string
  participantId: string
  topic?: string  // Omit for all, empty string for no scope, or specify topic name
  page?: number
  pageSize?: number
  chatOnly?: boolean
  sortOrder?: 'asc' | 'desc'  // Sort order for messages (default: asc)
}

// API returns array of messages directly, not wrapped
export type XiansMessageHistoryResponse = XiansMessage[]

// Send Message types
export interface SendMessageRequest {
  agentName: string
  activationName: string
  participantId: string
  text: string
  topic?: string
  data?: any
  type?: number  // 0 for Chat, 1 for Data
  requestId?: string
  hint?: string
  authorization?: string
  origin?: string
}

export interface SendMessageResponse {
  id: string
  threadId: string
  requestId: string
  createdAt: string
  status: string
}

// SSE Message types
export interface SSEMessageEvent {
  type: 'message'
  data: XiansMessage
}

export interface SSEHeartbeatEvent {
  type: 'heartbeat'
  data: {
    timestamp: string
  }
}

export type SSEEvent = SSEMessageEvent | SSEHeartbeatEvent

export interface SSEListenParams {
  tenantId: string
  agentName: string
  activationName: string
  participantId: string
  heartbeatSeconds?: number
}

// Common pagination
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Common API response wrapper
export interface XiansApiResponse<T> {
  success: boolean
  data: T
  error?: {
    code: string
    message: string
    details?: any
  }
}
