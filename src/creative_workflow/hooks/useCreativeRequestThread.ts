import { useEffect, useRef } from 'react';
import { useSignalR } from '../../contexts/SignalRContext';
import type { CreativeComment, CreativeRequestAttachment } from '../types/creative';

// Joins the per-request SignalR room (WorkflowHub.JoinRequestThread) for the lifetime of the
// component, and subscribes to new chat messages / attachments pushed to that room.
export function useCreativeRequestThread(
  requestId: number,
  onCommentCreated: (comment: CreativeComment) => void,
  onAttachmentAdded?: (attachment: CreativeRequestAttachment) => void,
) {
  const { invoke, listen, isConnected } = useSignalR();

  const onCommentRef = useRef(onCommentCreated);
  onCommentRef.current = onCommentCreated;
  const onAttachmentRef = useRef(onAttachmentAdded);
  onAttachmentRef.current = onAttachmentAdded;

  useEffect(() => {
    if (!isConnected) return;

    invoke('JoinRequestThread', requestId);

    const unsubscribeComment = listen('CreativeCommentCreated', (data: CreativeComment) => {
      if (data.requestId === requestId) onCommentRef.current(data);
    });
    const unsubscribeAttachment = listen('CreativeAttachmentAdded', (data: CreativeRequestAttachment) => {
      if (data.requestId === requestId) onAttachmentRef.current?.(data);
    });

    return () => {
      unsubscribeComment();
      unsubscribeAttachment();
      invoke('LeaveRequestThread', requestId);
    };
  }, [requestId, isConnected, invoke, listen]);
}
