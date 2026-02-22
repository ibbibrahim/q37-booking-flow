import React, { useState, useEffect } from 'react';
import { Bell, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import {
  isNotificationSupported,
  getNotificationPermission,
  hasRequestedPermission,
  requestNotificationPermission,
  getNotificationInstructions,
  isNotificationEnabled,
  setNotificationEnabled,
} from '@/utils/browserNotifications';

export const NotificationPermissionBanner: React.FC = () => {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [isRequesting, setIsRequesting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if user is in Ingest role
  const isIngestUser = user?.roles?.includes('Ingest') || false;

  useEffect(() => {
    if (!isIngestUser) {
      return;
    }

    if (!isNotificationSupported()) {
      return;
    }

    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    // Show banner if:
    // 1. Permission is default (not asked yet)
    // 2. User hasn't been asked before OR permission is denied
    // 3. User hasn't dismissed the banner
    if (currentPermission === 'default' && !hasRequestedPermission() && !dismissed) {
      setShowBanner(true);
    } else if (currentPermission === 'denied' && hasRequestedPermission() && !dismissed) {
      setShowBanner(true);
    }
  }, [isIngestUser, dismissed]);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);

    try {
      const result = await requestNotificationPermission();
      setPermission(result);

      if (result === 'granted') {
        setShowSuccess(true);
        setShowBanner(false);

        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else if (result === 'denied') {
        // Keep banner visible to show instructions
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
  };

  if (!isIngestUser) {
    return null;
  }

  if (!isNotificationSupported()) {
    return null;
  }

  // Success message after enabling
  if (showSuccess) {
    return (
      <div className="fixed top-20 right-4 z-50 max-w-md animate-in slide-in-from-top">
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-300">Notifications Enabled</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-400">
            You'll now receive desktop notifications for new booking requests
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Permission banner
  if (showBanner) {
    return (
      <div className="fixed top-20 right-4 z-50 max-w-md animate-in slide-in-from-top">
        <Alert className="bg-card border-primary/50 shadow-lg">
          <Bell className="h-4 w-4 text-primary" />
          <AlertTitle className="flex items-center justify-between">
            <span>Enable Desktop Notifications</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription className="space-y-3">
            {permission === 'default' ? (
              <>
                <p className="text-sm">
                  Get alerted when new booking requests arrive, even when this tab is in the background.
                </p>
                <Button
                  onClick={handleEnableNotifications}
                  disabled={isRequesting}
                  className="w-full"
                  size="sm"
                >
                  {isRequesting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Requesting Permission...
                    </>
                  ) : (
                    <>
                      <Bell className="mr-2 h-4 w-4" />
                      Enable Notifications
                    </>
                  )}
                </Button>
              </>
            ) : permission === 'denied' ? (
              <>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Notifications Blocked
                    </p>
                    <p className="text-xs text-muted-foreground">
                      To enable notifications, please update your browser settings:
                    </p>
                    <p className="text-xs bg-muted p-2 rounded font-mono">
                      {getNotificationInstructions()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Then refresh this page and try again.
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
};
