import { useCallback, useEffect, useRef, useState } from 'react';

/** Small toast for confirming actions. Returns [element, show(message)]. */
export function useToast(duration = 3500) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback(
    (message) => {
      clearTimeout(timer.current);
      setToast({ id: Date.now(), message });
      timer.current = setTimeout(() => setToast(null), duration);
    },
    [duration],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const element = (
    <div className="acct-toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className="acct-toast">
          {toast.message}
        </div>
      )}
    </div>
  );
  return [element, show];
}
