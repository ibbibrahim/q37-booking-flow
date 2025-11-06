import React from 'react';
import type { TransportRequest, Notification } from '../types/callsheet';
import { TRANSPORT_REASONS } from '../types/callsheet';

interface TransportFormProps {
  transportRequest: TransportRequest | null;
  onChange: (field: keyof TransportRequest, value: string) => void;
  notifications: Notification[];
  onToggleNotification: (id: string) => void;
}

export const TransportForm: React.FC<TransportFormProps> = ({
  transportRequest,
  onChange,
  notifications,
  onToggleNotification
}) => {
  if (!transportRequest) return null;

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          Transportation Request
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={transportRequest.reason}
              onChange={(e) => onChange('reason', e.target.value)}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">Select Reason</option>
              {TRANSPORT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Driver Name
            </label>
            <input
              type="text"
              value={transportRequest.driverName}
              onChange={(e) => onChange('driverName', e.target.value)}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="Enter driver name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Start Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={transportRequest.startDateTime}
              onChange={(e) => onChange('startDateTime', e.target.value)}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Return Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={transportRequest.returnDateTime}
              onChange={(e) => onChange('returnDateTime', e.target.value)}
              min={transportRequest.startDateTime}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Vehicle No
            </label>
            <input
              type="text"
              value={transportRequest.vehicleNo}
              onChange={(e) => onChange('vehicleNo', e.target.value)}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="Enter vehicle number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Requested By
            </label>
            <input
              type="text"
              value={transportRequest.requestedBy}
              disabled
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          Notifications
        </h3>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <label
              key={notification.id}
              className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={notification.enabled}
                onChange={() => onToggleNotification(notification.id)}
                className="mt-0.5 w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-card-foreground">{notification.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
