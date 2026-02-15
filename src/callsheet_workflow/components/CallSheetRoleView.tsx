import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CallSheetDashboard } from './CallSheetDashboard';
import { CallSheetForm } from './CallSheetForm';
import { callSheetApi } from "@/callsheet_workflow/services/mockCallSheetApi";
import type { CallSheetRequest } from '../types/callsheet';

interface CallSheetRoleViewProps {
  view: 'list' | 'new' | 'edit';
}

export const CallSheetRoleView: React.FC<CallSheetRoleViewProps> = ({ view }) => {
  const navigate = useNavigate();

  const handleCreate = async (data: Partial<CallSheetRequest>) => {
    try {
      await callSheetApi.createCallSheet(data);
      navigate('/callsheet');
    } catch (error) {
      console.error('Failed to create call sheet:', error);
      alert('Failed to create call sheet. Please try again.');
    }
  };

  const handleUpdate = async (data: Partial<CallSheetRequest>) => {
    try {
      if (!data.id) {
        throw new Error('Call sheet ID is required for update');
      }
      await callSheetApi.updateCallSheet(data.id, data);
      navigate('/callsheet');
    } catch (error) {
      console.error('Failed to update call sheet:', error);
      alert('Failed to update call sheet. Please try again.');
    }
  };

  if (view === 'new') {
    return <CallSheetForm onSubmit={handleCreate} mode="create" />;
  }

  if (view === 'edit') {
    return <CallSheetForm onSubmit={handleUpdate} mode="edit" />;
  }

  return <CallSheetDashboard />;
};
