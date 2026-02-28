import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import {
  isNotificationSupported,
  getNotificationPermission,
  isNotificationEnabled,
  setNotificationEnabled,
} from '@/utils/browserNotifications';

export const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [supported, setSupported] = useState(false);

  const isIngestUser = user?.roles?.includes('Ingest') || false;

  useEffect(() => {
    if (!isIngestUser) return;
    const isSupported = isNotificationSupported();
    setSupported(isSupported);
    if (isSupported) {
      setPermission(getNotificationPermission());
      setEnabled(isNotificationEnabled());
    }
  }, [isIngestUser]);

  if (!isIngestUser || !supported || permission !== 'granted') return null;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border">
      <div className="flex items-center gap-2 text-sm text-card-foreground">
        <Bell size={16} className="shrink-0" />
        <span>Desktop Notifications</span>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={(checked) => {
          setNotificationEnabled(checked);
          setEnabled(checked);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};
