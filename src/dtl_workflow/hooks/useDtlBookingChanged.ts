import { useEffect, useRef } from 'react';
import { useSignalR } from '../../contexts/SignalRContext';
import type { DtlBooking } from '../types/dtl';

// Fires whenever any DTL booking is created or changes (status, link, log, edit) —
// server-broadcast over the same WorkflowHub the rest of the app already uses.
export function useDtlBookingChanged(onChanged: (booking: DtlBooking) => void) {
  const { listen } = useSignalR();

  // Keep the subscription stable across renders while always calling the latest callback,
  // so callers can freely close over state/props without stale-closure bugs.
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    const unsubscribe = listen('DtlBookingChanged', (data: DtlBooking) => onChangedRef.current(data));
    return unsubscribe;
  }, [listen]);
}
