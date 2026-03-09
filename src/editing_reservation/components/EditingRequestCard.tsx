import React from 'react';
import { Clock, Calendar, User } from 'lucide-react';
import type { EditingRequest } from '../types/editing';
import { getEditingStatusBadgeClass } from '../utils/editingUtils';

interface EditingRequestCardProps {
  request: EditingRequest;
  onClick: () => void;
}

export const EditingRequestCard: React.FC<EditingRequestCardProps> = ({ request, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer hover:border-primary/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getEditingStatusBadgeClass(
                request.status
              )}`}
            >
              {request.status}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-card-foreground mb-1">{request.programName}</h3>
          <p className="text-sm text-muted-foreground">{request.producerName}</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <User size={20} />
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar size={16} />
          <span>{new Date(request.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock size={16} />
          <span>ID: {request.id}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">Duration: </span>
        <span className="text-xs font-medium text-card-foreground bg-muted px-2 py-1 rounded">
          {request.approximateDuration}
        </span>
      </div>
    </div>
  );
};
