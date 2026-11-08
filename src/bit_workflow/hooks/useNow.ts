import { useEffect, useState } from 'react';

/** Current time, re-rendering the caller every `intervalMs` (default 30s) — drives live SLA countdowns. */
export function useNow(intervalMs = 30000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
