/**
 * Xians Messaging API
 * 
 * Methods for interacting with the Xians messaging system
 */

import { XiansClient } from './client'
import { 
  XiansMessageHistoryResponse,
  XiansTopicsResponse,
  SendMessageRequest,
  SendMessageResponse
} from './types'

export class XiansMessagingApi {
  constructor(private client: XiansClient) {}

  /**
   * Get message history for an agent activation
   * 
   * @param tenantId - Tenant ID
   * @param participantId - Participant ID (must be from authenticated session)
   * @param params - Message history request parameters
   * @returns Array of messages
   */
  async getMessageHistory(
    tenantId: string,
    participantId: string,
    params: {
      agentName: string
      activationName: string
      topic?: string
      page?: number
      pageSize?: number
      chatOnly?: boolean
      sortOrder?: 'asc' | 'desc'
    }
  ): Promise<XiansMessageHistoryResponse> {
    const { 
      agentName, 
      activationName, 
      topic,
      page = 1,
      pageSize = 50,
      chatOnly = false,
      sortOrder = 'asc'
    } = params

    const queryParams = new URLSearchParams({
      agentName,
      activationName,
      participantId,
      page: page.toString(),
      pageSize: pageSize.toString(),
      chatOnly: chatOnly.toString(),
      sortOrder
    })

    // Add topic parameter if provided
    // Note: empty string for messages with no scope/topic, omit for all messages
    if (topic !== undefined) {
      queryParams.append('topic', topic)
    }

    return this.client.get<XiansMessageHistoryResponse>(
      `/api/v1/admin/tenants/${tenantId}/messaging/history?${queryParams.toString()}`
    )
  }

  /**
   * Get topics list for an agent activation
   * 
   * @param tenantId - Tenant ID
   * @param participantId - Participant ID (must be from authenticated session)
   * @param agentName - Agent name
   * @param activationName - Activation name
   * @param page - Page number (default: 1)
   * @param pageSize - Page size (default: 20)
   * @returns Topics list with pagination
   */
  async getTopics(
    tenantId: string,
    participantId: string,
    agentName: string,
    activationName: string,
    page = 1,
    pageSize = 20
  ): Promise<XiansTopicsResponse> {
    const queryParams = new URLSearchParams({
      agentName,
      activationName,
      participantId,
      page: page.toString(),
      pageSize: pageSize.toString(),
    })

    return this.client.get<XiansTopicsResponse>(
      `/api/v1/admin/tenants/${tenantId}/messaging/topics?${queryParams.toString()}`
    )
  }

  /**
   * Send a message to an agent activation
   * 
   * @param tenantId - Tenant ID
   * @param participantId - Participant ID (must be from authenticated session)
   * @param params - Message parameters
   * @param authorization - User's auth token
   * @returns Message response with ID and status
   */
  async sendMessage(
    tenantId: string,
    participantId: string,
    params: {
      agentName: string
      activationName: string
      text: string
      topic?: string
      data?: any
      type?: number
      requestId?: string
      hint?: string
      origin?: string
    },
    authorization?: string
  ): Promise<SendMessageResponse> {
    const requestBody: SendMessageRequest = {
      agentName: params.agentName,
      activationName: params.activationName,
      participantId,
      text: params.text,
      topic: params.topic,
      data: params.data,
      type: params.type ?? 0, // Default to Chat type
      requestId: params.requestId,
      hint: params.hint,
      authorization,
      origin: params.origin,
    }

    return this.client.post<SendMessageResponse>(
      `/api/v1/admin/tenants/${tenantId}/messaging/send`,
      requestBody
    )
  }

  /**
   * Delete messages for a specific topic
   * 
   * @param tenantId - Tenant ID
   * @param participantId - Participant ID (must be from authenticated session)
   * @param params - Delete parameters
   * @returns void
   */
  async deleteMessages(
    tenantId: string,
    participantId: string,
    params: {
      agentName: string
      activationName: string
      topic?: string  // Omit for all messages, undefined for general discussions (scope=null), or specify topic name
    }
  ): Promise<void> {
    const queryParams = new URLSearchParams({
      agentName: params.agentName,
      activationName: params.activationName,
      participantId,
    })

    // Add topic parameter if provided
    // undefined = general discussions (scope=null)
    // specific string = that topic
    if (params.topic !== undefined) {
      queryParams.append('topic', params.topic)
    }

    return this.client.delete(
      `/api/v1/admin/tenants/${tenantId}/messaging/messages?${queryParams.toString()}`
    )
  }

  /**
   * Subscribe to new messages via SSE (to be implemented)
   * Placeholder for future SSE implementation
   * 
   * @param tenantId - Tenant ID
   * @param participantId - Participant ID (must be from authenticated session)
   * @param params - SSE subscription parameters
   * @returns Unsubscribe function
   */
  subscribeToMessages(
    tenantId: string,
    participantId: string,
    params: {
      agentName: string
      activationName: string
      onMessage: (message: any) => void
      onError?: (error: Error) => void
    }
  ): () => void {
    // TODO: Implement SSE connection when endpoint is available
    throw new Error('Not implemented yet')
  }
}
