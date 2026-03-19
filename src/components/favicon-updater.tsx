'use client';

import { useEffect } from 'react';
import { useTenantStore } from '@/store/tenant-store';

const DEFAULT_FAVICON = '/logo.svg';

/**
 * Updates the browser favicon to use the current tenant's logo when available.
 * Falls back to the default logo when no tenant or no tenant logo.
 */
export function FaviconUpdater() {
  const getCurrentTenant = useTenantStore((s) => s.getCurrentTenant);
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const tenants = useTenantStore((s) => s.tenants);

  useEffect(() => {
    const tenantEntry = getCurrentTenant();
    const logo = tenantEntry?.tenant.metadata?.logo;
    const logoSrc = logo?.imgBase64
      ? `data:image/png;base64,${logo.imgBase64}`
      : logo?.url;

    const href = logoSrc || DEFAULT_FAVICON;

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }, [currentTenantId, tenants, getCurrentTenant]);

  return null;
}
