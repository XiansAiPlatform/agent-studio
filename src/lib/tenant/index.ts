import { TenantProvider } from "./provider"
import { XiansTenantProvider } from "./xians-provider"

export function getTenantProvider(): TenantProvider {
  return new XiansTenantProvider()
}

let tenantProvider: TenantProvider | null = null

export function useTenantProvider(): TenantProvider {
  if (!tenantProvider) {
    tenantProvider = getTenantProvider()
  }
  return tenantProvider
}

export * from "./provider"
export * from "@/types/tenant"
