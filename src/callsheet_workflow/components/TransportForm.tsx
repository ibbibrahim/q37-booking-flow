import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { TransportRequest, Notification } from '../types/callsheet';
import { TRANSPORT_REASONS } from '../types/callsheet';

interface TransportFormProps {
  transportRequest: TransportRequest | null;
  onChange: (field: keyof TransportRequest, value: string) => void;
  notifications: Notification[];
  onToggleNotification: (id: string) => void;
  isTechnicalStoreMode?: boolean;
}

export const TransportForm: React.FC<TransportFormProps> = ({
  transportRequest,
  onChange,
  notifications,
  onToggleNotification,
  isTechnicalStoreMode = false
}) => {
  if (!transportRequest) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transportation Request</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Select
                value={transportRequest.reason}
                onValueChange={(value) => onChange('reason', value)}
                disabled={isTechnicalStoreMode}
              >
                <SelectTrigger
                  id="reason"
                  className={isTechnicalStoreMode ? 'bg-muted cursor-not-allowed' : ''}
                >
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isTechnicalStoreMode && (
                <p className="text-xs text-muted-foreground">
                  Only the requester can modify this field
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="driverName">
                Driver Name {isTechnicalStoreMode && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="driverName"
                value={transportRequest.driverName}
                onChange={(e) => onChange('driverName', e.target.value)}
                placeholder="Enter driver name"
                disabled={!isTechnicalStoreMode}
                className={!isTechnicalStoreMode ? 'bg-muted cursor-not-allowed' : ''}
              />
              {!isTechnicalStoreMode && (
                <p className="text-xs text-muted-foreground">
                  Only Technical Store can fill this field
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDateTime">
                Start Date & Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startDateTime"
                type="datetime-local"
                value={transportRequest.startDateTime}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Set in Call Sheet booking information (Qatar time UTC+3)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnDateTime">
                Return Date & Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="returnDateTime"
                type="datetime-local"
                value={transportRequest.returnDateTime}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Set in Call Sheet booking information (Qatar time UTC+3)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="driverNo">
                Driver Phone No {isTechnicalStoreMode && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="driverNo"
                value={transportRequest.driverNo}
                onChange={(e) => onChange('driverNo', e.target.value)}
                placeholder="Enter driver number"
                disabled={!isTechnicalStoreMode}
                className={!isTechnicalStoreMode ? 'bg-muted cursor-not-allowed' : ''}
              />
              {!isTechnicalStoreMode && (
                <p className="text-xs text-muted-foreground">
                  Only Technical Store can fill this field
                </p>
              )}
            </div>

            <div className="space-y-2">
            <Label htmlFor="carType">Car Type</Label>
            <Select
              value={transportRequest.carType || ''}
              onValueChange={(value) => onChange('carType', value)}
              disabled={isTechnicalStoreMode}
            >
              <SelectTrigger
                id="carType"
                className={isTechnicalStoreMode ? 'bg-muted cursor-not-allowed' : ''}
              >
                <SelectValue placeholder="Select car type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Van">Van</SelectItem>
                <SelectItem value="SUV">SUV</SelectItem>
                <SelectItem value="Truck">Truck</SelectItem>
              </SelectContent>
            </Select>
            {isTechnicalStoreMode && (
              <p className="text-xs text-muted-foreground">
                Only the requester can modify this field
              </p>
            )}
          </div>

            {/* <div className="space-y-2">
              <Label htmlFor="requestedBy">Requested By</Label>
              <Input
                id="requestedBy"
                value={transportRequest.requestedBy}
                disabled
                className="bg-muted"
              />
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-center space-x-2">
              <Checkbox
                id={`notification-${notification.id}`}
                checked={notification.enabled}
                onCheckedChange={() => onToggleNotification(notification.id)}
              />
              <Label
                htmlFor={`notification-${notification.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {notification.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card> */}
    </div>
  );
};
