// Measures the active item inside a container so a single highlight element can slide between
// items (sidebar nav, account page tabs). Re-measures when the container resizes, for example when
// a nav group collapses or the sidebar turns into the icon rail.

import { useLayoutEffect, useState } from 'react';

export default function useActiveIndicator(containerRef, selector, deps) {
  const [state, setState] = useState({ box: null, ready: false });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let frame = 0;
    const measure = () => {
      const el = container.querySelector(selector);
      if (!el || el.getClientRects().length === 0) {
        setState((s) => ({ ...s, box: null }));
        return;
      }
      const c = container.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const box = {
        x: r.left - c.left + container.scrollLeft,
        y: r.top - c.top + container.scrollTop,
        w: r.width,
        h: r.height,
      };
      setState((s) => ({ ...s, box }));
      // Transitions start only after the first placement, so nothing slides in from the corner.
      if (!frame) frame = requestAnimationFrame(() => setState((s) => ({ ...s, ready: true })));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // The caller lists what moves the active item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
