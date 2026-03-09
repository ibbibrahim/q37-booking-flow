import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EditingRequestForm } from '../components/EditingRequestForm';
import { editingApi } from '../api/editingApi';
import type { EditingRequest } from '../types/editing';

export const EditEditingRequestPage: React.FC = () => {
  const { id } = useParams();
  const [request, setRequest] = useState<EditingRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const data = await editingApi.getById(Number(id));
        setRequest(data);
      } catch {
        setRequest(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Edit reservation not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <EditingRequestForm initialRequest={request} mode="edit" />
    </div>
  );
};
