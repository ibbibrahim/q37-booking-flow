import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CallSheetDashboard } from './CallSheetDashboard';
import { CallSheetForm } from './CallSheetForm';
import { callSheetApi } from "@/callsheet_workflow/services/mockCallSheetApi";
import { useAuth } from '@/contexts/AuthContext';
import { clearCallsheetDraft } from '../utils/callsheetDraft';
import type { CallSheetRequest } from '../types/callsheet';

interface CallSheetRoleViewProps {
  view: 'list' | 'new' | 'edit';
}

export const CallSheetRoleView: React.FC<CallSheetRoleViewProps> = ({ view }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Clear before navigating, and again right after: the form's unmount flush could
  // otherwise re-write a pending autosave once the form has been removed.
  const clearDraftAfterSuccess = () => {
    const userId = user?.id ?? 'anon';
    clearCallsheetDraft(userId);
    setTimeout(() => clearCallsheetDraft(userId), 0);
  };

  const handleCreate = async (data: Partial<CallSheetRequest>) => {
    try {
      await callSheetApi.createCallSheet(data);
      clearDraftAfterSuccess();
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
