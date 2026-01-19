/**
 * Xians Server API - Agents
 * 
 * Methods for agent-related API calls
 */

import { XiansClient } from './client'
import { XiansAgent, CreateAgentRequest, PaginatedResponse, XiansAgentTemplate, XiansAgentDeployment, XiansAgentDeploymentsResponse, XiansAgentActivation, CreateAgentActivationRequest, XiansAgentDeploymentDetail } from './types'

export class XiansAgentsApi {
  constructor(private client: XiansClient) {}

  /**
   * List agents for a tenant
   * GET /api/v1/admin/tenants/{tenantId}/agents
   */
  async listAgents(
    tenantId: string,
    params?: {
      page?: number
      pageSize?: number
      status?: string
    }
  ): Promise<PaginatedResponse<XiansAgent>> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString())
    if (params?.status) query.set('status', params.status)

    const queryString = query.toString()
    const path = `/api/v1/admin/tenants/${tenantId}/agents${queryString ? `?${queryString}` : ''}`
    
    return this.client.get<PaginatedResponse<XiansAgent>>(path)
  }

  /**
   * Get a specific agent
   * GET /api/v1/admin/tenants/{tenantId}/agents/{agentId}
   */
  async getAgent(tenantId: string, agentId: string): Promise<XiansAgent> {
    return this.client.get<XiansAgent>(
      `/api/v1/admin/tenants/${tenantId}/agents/${agentId}`
    )
  }

  /**
   * Create a new agent
   * POST /api/v1/admin/tenants/{tenantId}/agents
   */
  async createAgent(
    tenantId: string,
    data: CreateAgentRequest
  ): Promise<XiansAgent> {
    return this.client.post<XiansAgent>(
      `/api/v1/admin/tenants/${tenantId}/agents`,
      data
    )
  }

  /**
   * Update an agent
   * PATCH /api/v1/admin/tenants/{tenantId}/agents/{agentId}
   */
  async updateAgent(
    tenantId: string,
    agentId: string,
    data: Partial<CreateAgentRequest>
  ): Promise<XiansAgent> {
    return this.client.patch<XiansAgent>(
      `/api/v1/admin/tenants/${tenantId}/agents/${agentId}`,
      data
    )
  }

  /**
   * Delete an agent
   * DELETE /api/v1/admin/tenants/{tenantId}/agents/{agentId}
   */
  async deleteAgent(tenantId: string, agentId: string): Promise<void> {
    return this.client.delete<void>(
      `/api/v1/admin/tenants/${tenantId}/agents/${agentId}`
    )
  }

  /**
   * List Available Agents (SystemScoped agents)
   * GET /api/v1/admin/agentTemplates
   * No X-Tenant-Id header required
   */
  async listAgentTemplates(
    params?: {
      basicDataOnly?: boolean
    }
  ): Promise<XiansAgentTemplate[]> {
    const query = new URLSearchParams()
    if (params?.basicDataOnly !== undefined) {
      query.set('basicDataOnly', params.basicDataOnly.toString())
    }

    const queryString = query.toString()
    const path = `/api/v1/admin/agentTemplates${queryString ? `?${queryString}` : ''}`
    
    return this.client.get<XiansAgentTemplate[]>(path)
  }

  /**
   * List agent deployments for a tenant
   * GET /api/v1/admin/tenants/{tenantId}/agentDeployments
   */
  async listAgentDeployments(
    tenantId: string,
    params?: {
      page?: number
      pageSize?: number
      status?: string
    }
  ): Promise<XiansAgentDeploymentsResponse> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString())
    if (params?.status) query.set('status', params.status)

    const queryString = query.toString()
    const path = `/api/v1/admin/tenants/${tenantId}/agentDeployments${queryString ? `?${queryString}` : ''}`
    
    return this.client.get<XiansAgentDeploymentsResponse>(path)
  }

  /**
   * Get agent deployment details by agent name
   * GET /api/v1/admin/tenants/{tenantId}/agentDeployments/{agentName}
   */
  async getAgentDeployment(
    tenantId: string,
    agentName: string
  ): Promise<XiansAgentDeploymentDetail> {
    return this.client.get<XiansAgentDeploymentDetail>(
      `/api/v1/admin/tenants/${tenantId}/agentDeployments/${agentName}`
    )
  }

  /**
   * Deploy an agent template to a tenant
   * POST /api/v1/admin/agentTemplates/{templateObjectId}/deploy
   */
  async deployAgentTemplate(
    templateObjectId: string,
    tenantId: string
  ): Promise<any> {
    const path = `/api/v1/admin/agentTemplates/${templateObjectId}/deploy?tenantId=${tenantId}`
    return this.client.post<any>(path)
  }

  /**
   * Delete an agent deployment
   * DELETE /api/v1/admin/tenants/{tenantId}/agentDeployments/{agentName}
   */
  async deleteAgentDeployment(
    tenantId: string,
    agentName: string
  ): Promise<void> {
    return this.client.delete<void>(
      `/api/v1/admin/tenants/${tenantId}/agentDeployments/${agentName}`
    )
  }

  /**
   * Create an agent deployment from a template (deprecated - use deployAgentTemplate)
   * POST /api/v1/admin/tenants/{tenantId}/agentDeployments
   */
  async createAgentDeployment(
    tenantId: string,
    data: {
      agentId: string
      name: string
      description?: string
      config?: Record<string, any>
    }
  ): Promise<XiansAgentDeployment> {
    return this.client.post<XiansAgentDeployment>(
      `/api/v1/admin/tenants/${tenantId}/agentDeployments`,
      data
    )
  }

  /**
   * Create an agent activation (instance)
   * POST /api/v1/admin/tenants/{tenantId}/agentActivations
   */
  async createActivation(
    tenantId: string,
    data: CreateAgentActivationRequest
  ): Promise<XiansAgentActivation> {
    return this.client.post<XiansAgentActivation>(
      `/api/v1/admin/tenants/${tenantId}/agentActivations`,
      data
    )
  }

  /**
   * List agent activations for a tenant
   * GET /api/v1/admin/tenants/{tenantId}/agentActivations
   */
  async listActivations(
    tenantId: string,
    params?: {
      page?: number
      pageSize?: number
      agentName?: string
      status?: string
    }
  ): Promise<PaginatedResponse<XiansAgentActivation>> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString())
    if (params?.agentName) query.set('agentName', params.agentName)
    if (params?.status) query.set('status', params.status)

    const queryString = query.toString()
    const path = `/api/v1/admin/tenants/${tenantId}/agentActivations${queryString ? `?${queryString}` : ''}`
    
    return this.client.get<PaginatedResponse<XiansAgentActivation>>(path)
  }

  /**
   * Activate an agent activation
   * POST /api/v1/admin/tenants/{tenantId}/agentActivations/{activationId}/activate
   */
  async activateActivation(
    tenantId: string,
    activationId: string,
    workflowConfiguration?: any
  ): Promise<void> {
    return this.client.post<void>(
      `/api/v1/admin/tenants/${tenantId}/agentActivations/${activationId}/activate`,
      { workflowConfiguration }
    )
  }

  /**
   * Deactivate an agent activation
   * POST /api/v1/admin/tenants/{tenantId}/agentActivations/{activationId}/deactivate
   */
  async deactivateActivation(
    tenantId: string,
    activationId: string
  ): Promise<void> {
    return this.client.post<void>(
      `/api/v1/admin/tenants/${tenantId}/agentActivations/${activationId}/deactivate`
    )
  }

  /**
   * Delete an agent activation
   * DELETE /api/v1/admin/tenants/{tenantId}/agentActivations/{activationId}
   */
  async deleteActivation(
    tenantId: string,
    activationId: string
  ): Promise<void> {
    return this.client.delete<void>(
      `/api/v1/admin/tenants/${tenantId}/agentActivations/${activationId}`
    )
  }
}
