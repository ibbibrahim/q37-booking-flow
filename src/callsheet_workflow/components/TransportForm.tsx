import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';
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
  const [startDateError, setStartDateError] = useState<string>('');
  const [returnDateError, setReturnDateError] = useState<string>('');

  if (!transportRequest) return null;

  // Get current datetime in the required format for datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const minDateTime = getCurrentDateTime();

  // Validate start date is not in the past
  const validateStartDate = (value: string) => {
    if (!value) {
      setStartDateError('');
      return;
    }

    const selectedDate = new Date(value);
    const now = new Date();

    if (selectedDate < now) {
      setStartDateError('Cannot select a past date and time');
      return false;
    }

    setStartDateError('');
    return true;
  };

  // Validate return date is after start date
  const validateReturnDate = (returnValue: string, startValue: string) => {
    if (!returnValue) {
      setReturnDateError('');
      return;
    }

    const returnDate = new Date(returnValue);
    const now = new Date();

    // Check if return date is in the past
    if (returnDate < now) {
      setReturnDateError('Cannot select a past date and time');
      return false;
    }

    // Check if return date is after start date
    if (startValue) {
      const startDate = new Date(startValue);
      if (returnDate <= startDate) {
        setReturnDateError('Return date must be after start date');
        return false;
      }
    }

    setReturnDateError('');
    return true;
  };

  // Validate on mount and when values change
  useEffect(() => {
    if (transportRequest.startDateTime) {
      validateStartDate(transportRequest.startDateTime);
    }
    if (transportRequest.returnDateTime) {
      validateReturnDate(transportRequest.returnDateTime, transportRequest.startDateTime);
    }
  }, [transportRequest.startDateTime, transportRequest.returnDateTime]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const isValid = validateStartDate(value);

    if (isValid || !value) {
      onChange('startDateTime', value);
      // Re-validate return date when start date changes
      if (transportRequest.returnDateTime) {
        validateReturnDate(transportRequest.returnDateTime, value);
      }
    }
  };

  const handleReturnDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const isValid = validateReturnDate(value, transportRequest.startDateTime);

    if (isValid || !value) {
      onChange('returnDateTime', value);
    }
  };

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
              >
                <SelectTrigger id="reason">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="driverName">Driver Name</Label>
              <Input
                id="driverName"
                value={transportRequest.driverName}
                onChange={(e) => onChange('driverName', e.target.value)}
                placeholder="Enter driver name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDateTime">
                Start Date & Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startDateTime"
                type="datetime-local"
                value={transportRequest.startDateTime}
                onChange={handleStartDateChange}
                min={minDateTime}
                className={startDateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {startDateError ? (
                <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{startDateError}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Cannot select a past date and time
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnDateTime">
                Return Date & Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="returnDateTime"
                type="datetime-local"
                value={transportRequest.returnDateTime}
                onChange={handleReturnDateChange}
                min={transportRequest.startDateTime || minDateTime}
                className={returnDateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {returnDateError ? (
                <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{returnDateError}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Must be after start date and time
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="driverNo">Driver Phone No</Label>
              <Input
                id="driverNo"
                value={transportRequest.driverNo}
                onChange={(e) => onChange('driverNo', e.target.value)}
                placeholder="Enter driver number"
              />
            </div>

            <div className="space-y-2">
            <Label htmlFor="carType">Car Type</Label>
            <Select
              value={transportRequest.carType || ''}
              onValueChange={(value) => onChange('carType', value)}
            >
              <SelectTrigger id="carType">
                <SelectValue placeholder="Select car type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Van">Van</SelectItem>
                <SelectItem value="SUV">SUV</SelectItem>
              </SelectContent>
            </Select>
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
