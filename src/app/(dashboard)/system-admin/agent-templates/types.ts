/**
 * Types for the System Admin → Agent Templates feature.
 * Mirrors the Xians server AdminTemplateEndpoints DTOs
 * (AgentWithDefinitions, Agent, TemplateDeployments).
 */

/** The system-scoped agent document that backs a template. */
export interface AgentTemplateAgent {
  id: string
  name: string
  tenant: string | null
  createdBy: string
  createdAt: string
  ownerAccess: string[]
  readAccess: string[]
  writeAccess: string[]
  systemScoped: boolean
  onboardingJson: string | null
  description: string | null
  summary: string | null
  version: string | null
  author: string | null
  category: string | null
  samplePrompts: string[]
}

/**
 * A flow definition attached to a template. When the list is fetched with
 * basicDataOnly=true only agent, workflowType, name and timestamps are populated.
 */
export interface AgentTemplateDefinition {
  id: string
  agent: string
  workflowType: string
  name: string | null
  createdAt: string
  updatedAt: string
  createdBy?: string | null
  summary?: string | null
}

/** One item of GET /api/v1/admin/agentTemplates. */
export interface AgentTemplate {
  agent: AgentTemplateAgent
  definitions: AgentTemplateDefinition[]
}

/** A single tenant-scoped deployment of a system template. */
export interface TemplateDeployment {
  agentId: string
  tenant: string | null
  createdBy: string | null
  createdAt: string
}

/** Response of GET /api/v1/admin/agentTemplates/{id}/deployments. */
export interface TemplateDeployments {
  templateId: string
  templateName: string
  deploymentCount: number
  deployments: TemplateDeployment[]
}
