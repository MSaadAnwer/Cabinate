import { useRef, useState } from 'react';

/** Lock immediately, before a second click can send the same record version. */
export function usePendingAction() {
  const active = useRef(false);
  const [pending, setPending] = useState(false);
  const run = async (action: () => Promise<void>) => {
    if (active.current) return;
    active.current = true;
    setPending(true);
    try {
      await action();
    } catch {
      // The parent mutation handler displays the error notification.
    } finally {
      active.current = false;
      setPending(false);
    }
  };
  return { pending, run };
}
