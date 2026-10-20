'use client';

import { useEffect } from 'react';
import { useTenantStore } from '@/store/tenant-store';
import { DEFAULT_FAVICON, tenantFaviconProxyUrl } from '@/lib/tenant/favicon';

/**
 * Keeps the browser tab icon pointing at the current tenant's icon: the
 * tenant's favicon, else its logo, else the default icon (`/logo.svg`). It
 * runs when the page loads, after a tenant switch, and after a logo or favicon
 * is saved.
 */
export function FaviconUpdater() {
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const hasTenants = useTenantStore((s) => s.tenants.length > 0);
  const brandingVersion = useTenantStore((s) => s.brandingVersion);

  useEffect(() => {
    // Before the tenant list loads (or with no tenant), keep the link the
    // server rendered.
    if (!hasTenants || !currentTenantId) {
      setIconLinks(serverRenderedHref());
      return;
    }

    const tenantUrl = tenantFaviconProxyUrl(currentTenantId, { version: brandingVersion });
    const controller = new AbortController();

    // Ask the favicon route which icon this tenant has. When the tenant has
    // none, the route redirects to the default icon; in that case link to the
    // default icon file directly (as before tenant favicons). Browsers don't
    // reliably accept the redirect itself as a tab icon, and then fall back to
    // Next.js's placeholder favicon.ico.
    fetch(tenantUrl, { signal: controller.signal, cache: 'no-store' })
      .then((res) => {
        const isDefault = res.redirected && new URL(res.url).pathname === DEFAULT_FAVICON;
        setIconLinks(isDefault ? DEFAULT_FAVICON : tenantUrl);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIconLinks(DEFAULT_FAVICON);
      });

    return () => controller.abort();
  }, [currentTenantId, hasTenants, brandingVersion]);

  return null;
}

/** The icon link our server rendered (the one that isn't Next.js's favicon.ico). */
function serverRenderedHref(): string {
  return (
    Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
      .map((link) => link.getAttribute('href'))
      .find((h) => h && !h.startsWith('/favicon.ico')) ?? DEFAULT_FAVICON
  );
}

/**
 * Points every icon link on the page at `href`. Next.js also adds an icon link
 * for src/app/favicon.ico (its placeholder icon); changing every link means the
 * browser can't pick that one. (The old code did the same by changing the
 * first link.)
 */
function setIconLinks(href: string): void {
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
  if (links.length === 0) {
    const link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
    links.push(link);
  }
  for (const link of links) {
    // Setting the same URL again makes some browsers reload the icon, so skip it.
    if (link.getAttribute('href') === href) continue;
    // The tenant icon may be a PNG, ICO or other format, so remove the old
    // type and size hints.
    link.removeAttribute('type');
    link.removeAttribute('sizes');
    link.href = href;
  }
}
