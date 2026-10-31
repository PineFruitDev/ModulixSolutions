import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks the user's reduced-motion preference.
 *
 * MotionConfig already stops framer-motion transforms, but it cannot reach
 * timer-driven rotation, so components that advance state on an interval read
 * this directly. Starts false so server and first client render agree, then
 * corrects after mount.
 */
export default function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(QUERY);
    setPrefersReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }

    // Safari below 14 only exposes the deprecated listener API.
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, []);

  return prefersReducedMotion;
}
