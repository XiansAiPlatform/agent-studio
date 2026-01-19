/**
 * Xians Server API SDK
 * 
 * Main entry point for Xians server API client
 */

import { XiansClient, createXiansClient } from './client'
import { XiansTenantsApi } from './tenants'
import { XiansAgentsApi } from './agents'
import { XiansMessagingApi } from './messaging'

/**
 * Xians SDK - Main API client
 */
export class XiansSDK {
  public client: XiansClient
  public tenants: XiansTenantsApi
  public agents: XiansAgentsApi
  public messaging: XiansMessagingApi

  constructor(authToken?: string) {
    this.client = createXiansClient(authToken)
    this.tenants = new XiansTenantsApi(this.client)
    this.agents = new XiansAgentsApi(this.client)
    this.messaging = new XiansMessagingApi(this.client)
  }

  /**
   * Update the auth token for all API calls
   */
  setAuthToken(token: string | undefined) {
    this.client.setAuthToken(token)
  }
}

/**
 * Create a new Xians SDK instance
 * 
 * @param authToken - Optional auth token (usually from session)
 * @returns XiansSDK instance
 */
export function createXiansSDK(authToken?: string): XiansSDK {
  return new XiansSDK(authToken)
}

// Export everything
export * from './client'
export * from './types'
export * from './tenants'
export * from './agents'
export * from './messaging'
