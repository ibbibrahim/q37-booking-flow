import React from 'react';
import { Check } from 'lucide-react';
import type { DepartmentAcknowledgement } from '../types/callsheet';

interface AcknowledgementPanelProps {
  acknowledgements: DepartmentAcknowledgement[];
  onChange: (index: number, field: keyof DepartmentAcknowledgement, value: boolean | string) => void;
}

export const AcknowledgementPanel: React.FC<AcknowledgementPanelProps> = ({
  acknowledgements,
  onChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">
        Department Acknowledgements
      </h3>

      {acknowledgements.map((ack, index) => (
        <div key={ack.department} className="bg-muted rounded-lg p-4 border border-border">
          <h4 className="font-medium text-card-foreground mb-3">{ack.department}</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  ack.acknowledged
                    ? 'bg-primary border-primary'
                    : 'border-border'
                }`}
                onClick={() => onChange(index, 'acknowledged', !ack.acknowledged)}
              >
                {ack.acknowledged && <Check size={14} className="text-primary-foreground" />}
              </div>
              <span className="text-sm text-card-foreground">Acknowledge</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  ack.approved
                    ? 'bg-green-500 border-green-500'
                    : 'border-border'
                }`}
                onClick={() => onChange(index, 'approved', !ack.approved)}
              >
                {ack.approved && <Check size={14} className="text-white" />}
              </div>
              <span className="text-sm text-card-foreground">Approve</span>
            </label>
          </div>

          <textarea
            value={ack.comment}
            onChange={(e) => onChange(index, 'comment', e.target.value)}
            placeholder="Add comment (optional)"
            rows={2}
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-card-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
          />
        </div>
      ))}
    </div>
  );
};
