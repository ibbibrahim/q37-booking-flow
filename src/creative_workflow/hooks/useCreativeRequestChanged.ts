import { useEffect, useRef } from 'react';
import { useSignalR } from '../../contexts/SignalRContext';
import type { CreativeRequest } from '../types/creative';

// Fires whenever any creative request is created or changes (status, approval, edit) —
// server-broadcast over the same WorkflowHub the rest of the app already uses.
export function useCreativeRequestChanged(onChanged: (request: CreativeRequest) => void) {
  const { listen } = useSignalR();

  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    const unsubscribe = listen('CreativeRequestChanged', (data: CreativeRequest) => onChangedRef.current(data));
    return unsubscribe;
  }, [listen]);
}
