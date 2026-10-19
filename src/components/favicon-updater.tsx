'use client';

import { useEffect } from 'react';
import { useTenantStore } from '@/store/tenant-store';
import { DEFAULT_FAVICON, tenantFaviconProxyUrl } from '@/lib/tenant/favicon';

/**
 * Sets the browser tab icon to the current tenant's favicon. If the tenant has
 * no favicon, its logo is used. If it has no logo either, the default icon is
 * used. The default icon is also used when no tenant is selected.
 */
export function FaviconUpdater() {
  const getCurrentTenant = useTenantStore((s) => s.getCurrentTenant);
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const tenants = useTenantStore((s) => s.tenants);
  const brandingVersion = useTenantStore((s) => s.brandingVersion);

  useEffect(() => {
    const tenantEntry = getCurrentTenant();
    const logo = tenantEntry?.tenant.metadata?.logo;

    const href = tenantEntry
      ? tenantFaviconProxyUrl(tenantEntry.tenant.id, {
          fallbackToLogo: Boolean(logo?.imgBase64 || logo?.url),
          version: brandingVersion,
        })
      : DEFAULT_FAVICON;

    // Next.js also adds an icon link for src/app/favicon.ico. Change every icon
    // link, or the browser may keep showing that one.
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    if (links.length === 0) {
      const link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
      links.push(link);
    }
    for (const link of links) {
      // The tenant icon may be a PNG, ICO or other format, so remove the old
      // type and size hints.
      link.removeAttribute('type');
      link.removeAttribute('sizes');
      link.href = href;
    }
  }, [currentTenantId, tenants, getCurrentTenant, brandingVersion]);

  return null;
}
