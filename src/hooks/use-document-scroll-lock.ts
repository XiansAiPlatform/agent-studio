'use client';

import { useEffect } from 'react';

let lockCount = 0;
let prevHtmlOverflow = '';
let prevBodyOverflow = '';

/**
 * Locks document/body scroll for as long as the calling component stays mounted.
 * Ref-counted at module scope so it works no matter which layout (admin sidebar or
 * participant single-panel) currently wraps the caller, and so an overlapping
 * mount/unmount pair (e.g. during a route transition) can't have one instance
 * clobber another's lock.
 *
 * Intended for full-height chat views: they manage their own internal scroll
 * region, and leaving the document itself scrollable causes iOS/Android
 * rubber-band bounce around the fixed composer. Do not call this from routes
 * that rely on native document scroll (e.g. to bring a focused form field above
 * the mobile keyboard).
 */
export function useDocumentScrollLock() {
  useEffect(() => {
    if (lockCount === 0) {
      const html = document.documentElement;
      const body = document.body;
      prevHtmlOverflow = html.style.overflow;
      prevBodyOverflow = body.style.overflow;
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.overflow = prevBodyOverflow;
      }
    };
  }, []);
}
