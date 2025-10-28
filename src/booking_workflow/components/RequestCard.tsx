import React from 'react';
import { Clock, Calendar, AlertCircle, CheckCircle2, Radio, User } from 'lucide-react';
import type { WorkflowRequest, WorkflowStatus } from '../types/workflow';

interface RequestCardProps {
  request: WorkflowRequest;
  onClick: () => void;
}

const statusColors: Record<WorkflowStatus, { bg: string; text: string; border: string }> = {
  'Draft': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  'Submitted': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  'With NOC': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  'Clarification Requested': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  'Resources Added': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  'With Ingest': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  'Completed': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  'Not Done': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' }
};

const priorityColors = {
  'Normal': 'text-slate-600',
  'High': 'text-orange-600',
  'Urgent': 'text-red-600'
};

export const RequestCard: React.FC<RequestCardProps> = ({ request, onClick }) => {
  const statusStyle = statusColors[request.status];
  const priorityColor = priorityColors[request.priority];

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer hover:border-primary/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
              {request.status}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColor}`}>
              {request.priority}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-card-foreground mb-1">{request.title}</h3>
          <p className="text-sm text-muted-foreground">{request.program}</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {request.bookingType === 'Incoming Feed' ? <Radio size={20} /> : <User size={20} />}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar size={16} />
          <span>{new Date(request.airDateTime).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock size={16} />
          <span>Updated {new Date(request.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Type:</span>
          <span className="text-xs font-medium text-card-foreground bg-muted px-2 py-1 rounded">
            {request.bookingType}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {request.nocRequired === 'Yes' && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <AlertCircle size={14} />
              <span>NOC Required</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
