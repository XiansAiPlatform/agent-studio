'use client';

import { useEffect, useState } from 'react';

const QUERY = '(max-width: 767px)';

/**
 * SSR-safe hook for detecting mobile-sized viewports.
 *
 * Returns `false` during SSR / first paint to avoid hydration mismatches,
 * then resolves to the real value on mount and re-renders on viewport changes.
 *
 * Breakpoint matches Tailwind's `md` (768px): anything below is "mobile".
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;

    const mql = window.matchMedia(QUERY);
    const update = () => setIsMobile(mql.matches);

    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return isMobile;
}
