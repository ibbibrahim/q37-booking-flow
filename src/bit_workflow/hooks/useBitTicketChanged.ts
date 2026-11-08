import { useEffect, useRef } from 'react';
import { useSignalR } from '@/contexts/SignalRContext';
import type { BitTicketListItem } from '../types/ticket';

// Fires whenever any BIT ticket is created or changes — server-broadcast over the shared WorkflowHub.
export function useBitTicketChanged(onChanged: (ticket: BitTicketListItem) => void) {
  const { listen } = useSignalR();

  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    const unsubscribe = listen('BitTicketChanged', (data: BitTicketListItem) => onChangedRef.current(data));
    return unsubscribe;
  }, [listen]);
}
