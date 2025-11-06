import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CallSheetDashboard } from './CallSheetDashboard';
import { CallSheetForm } from './CallSheetForm';
import { mockCallSheetApi } from '../services/mockCallSheetApi';
import type { CallSheetRequest } from '../types/callsheet';

interface CallSheetRoleViewProps {
  view: 'list' | 'new';
}

export const CallSheetRoleView: React.FC<CallSheetRoleViewProps> = ({ view }) => {
  const navigate = useNavigate();

  const handleSubmit = async (data: Partial<CallSheetRequest>) => {
    try {
      await mockCallSheetApi.createCallSheet(data);
      navigate('/callsheet');
    } catch (error) {
      console.error('Failed to create call sheet:', error);
      alert('Failed to create call sheet. Please try again.');
    }
  };

  if (view === 'new') {
    return <CallSheetForm onSubmit={handleSubmit} />;
  }

  return <CallSheetDashboard />;
};
