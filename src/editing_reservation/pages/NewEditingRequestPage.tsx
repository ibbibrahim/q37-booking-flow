import React from 'react';
import { EditingRequestForm } from '../components/EditingRequestForm';

export const NewEditingRequestPage: React.FC = () => {
  return (
    <div className="p-6">
      <EditingRequestForm mode="create" />
    </div>
  );
};
