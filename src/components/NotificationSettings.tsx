import React, { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import {
  isNotificationSupported,
  getNotificationPermission,
  isNotificationEnabled,
  setNotificationEnabled,
  getNotificationInstructions,
} from '@/utils/browserNotifications';

export const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [supported, setSupported] = useState(false);

  // Check if user is in Ingest role
  const isIngestUser = user?.roles?.includes('Ingest') || false;

  useEffect(() => {
    const isSupported = isNotificationSupported();
    setSupported(isSupported);

    if (isSupported) {
      setPermission(getNotificationPermission());
      setEnabled(isNotificationEnabled());
    }
  }, []);

  const handleToggle = (checked: boolean) => {
    if (permission === 'granted') {
      setNotificationEnabled(checked);
      setEnabled(checked);
    }
  };

  // Only show for Ingest users
  if (!isIngestUser) {
    return null;
  }

  // Don't show if not supported
  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Desktop Notifications
          </CardTitle>
          <CardDescription>
            Get alerted when new booking requests arrive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Desktop notifications are not supported in this browser.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Desktop Notifications
        </CardTitle>
        <CardDescription>
          Get alerted when new booking requests arrive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission === 'granted' ? (
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <Label htmlFor="notifications-toggle" className="text-sm font-medium">
                Enable Desktop Notifications
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Receive notifications even when this tab is in the background
              </p>
            </div>
            <Switch
              id="notifications-toggle"
              checked={enabled}
              onCheckedChange={handleToggle}
            />
          </div>
        ) : permission === 'denied' ? (
          <Alert>
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="space-y-2">
              <p className="font-medium text-yellow-800 dark:text-yellow-300">
                Notifications are blocked
              </p>
              <p className="text-xs">
                To enable notifications, please update your browser settings:
              </p>
              <p className="text-xs bg-muted p-2 rounded font-mono">
                {getNotificationInstructions()}
              </p>
              <p className="text-xs">
                Then refresh this page.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You haven't enabled notifications yet. Click the "Enable Notifications" button when prompted.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
