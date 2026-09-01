import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copies text to the clipboard and exposes a brief "copied" success state.
 * The success state only appears once the clipboard write actually resolves,
 * so a denied-permission or unfocused-page failure never shows false feedback.
 */
export function useCopyFeedback(resetDelayMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return;
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), resetDelayMs);
    },
    [resetDelayMs]
  );

  return [copied, copy] as const;
}
