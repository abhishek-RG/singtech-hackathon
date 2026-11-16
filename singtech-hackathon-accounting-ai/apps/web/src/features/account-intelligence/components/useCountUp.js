// Counts a number up from zero once, the first time it arrives. Later changes (another view, a
// filter) show the new value at once. Skipped when the visitor prefers reduced motion.

import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

export default function useCountUp(target, { duration = 450 } = {}) {
  const [value, setValue] = useState(target ?? 0);
  const counted = useRef(false);

  useEffect(() => {
    if (target === null || target === undefined) return undefined;
    if (counted.current || prefersReducedMotion()) {
      counted.current = true;
      setValue(target);
      return undefined;
    }
    counted.current = true;
    let finished = false;
    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
      else finished = true;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      // React may run effects twice in development; let the second run count again.
      if (!finished) counted.current = false;
    };
  }, [target, duration]);

  return value;
}
