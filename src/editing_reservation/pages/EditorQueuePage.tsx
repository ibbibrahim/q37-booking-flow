import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EditingRequestList } from '../components/EditingRequestList';
import { EditorAssignmentForm } from '../components/EditorAssignmentForm';
import { editingApi } from '../api/editingApi';
import { useSignalR } from '@/contexts/SignalRContext';
import type { EditingRequest } from '../types/editing';

export const EditorQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { listen, isConnected } = useSignalR();
  const [requests, setRequests] = useState<EditingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [assignRequest, setAssignRequest] = useState<EditingRequest | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await editingApi.getEditorQueue();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load editor queue:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeCreated = listen('EditingRequestCreated', (data: EditingRequest) => {
      setRequests((prev) => {
        const exists = prev.some((r) => r.id === data.id);
        if (exists) return prev;
        return [data, ...prev];
      });
    });

    const unsubscribeUpdated = listen('EditingRequestUpdated', (data: EditingRequest) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === data.id ? data : r))
      );
    });

    const unsubscribeCancelled = listen('EditingRequestCancelled', (data: EditingRequest) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === data.id ? data : r))
      );
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeCancelled();
    };
  }, [isConnected, listen]);

  const filteredRequests =
    activeTab === 'all'
      ? requests
      : requests.filter((r) => r.status === activeTab);

  const handleAssignSuccess = () => {
    setAssignRequest(null);
    loadQueue();
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-card-foreground">Editor Queue</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="Pending">Pending</TabsTrigger>
          <TabsTrigger value="Acknowledged">Acknowledged</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          <EditingRequestList
            requests={filteredRequests}
            loading={loading}
            showAssignButton
            onAssign={(req) => setAssignRequest(req)}
          />
        </TabsContent>
      </Tabs>

      {assignRequest && (
        <Dialog open={!!assignRequest} onOpenChange={() => setAssignRequest(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Editor - {assignRequest.programName}</DialogTitle>
            </DialogHeader>
            <EditorAssignmentForm
              editingRequest={assignRequest}
              onSuccess={handleAssignSuccess}
              onCancel={() => setAssignRequest(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
