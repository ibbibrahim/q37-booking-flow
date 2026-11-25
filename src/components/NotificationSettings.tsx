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

  // Same roles as NotificationPermissionBanner — those whose workflow pushes native browser notifications.
  const CREATIVE_ROLES = ['SocialMedia', 'Booking', 'GraphicsTeam', 'MotionGraphicsTeam'];
  const canUseDesktopNotifications =
    user?.roles?.includes('Ingest') ||
    user?.roles?.includes('NOC') ||
    user?.roles?.some((r) => CREATIVE_ROLES.includes(r)) ||
    false;

  useEffect(() => {
    if (!canUseDesktopNotifications) return;
    const isSupported = isNotificationSupported();
    setSupported(isSupported);
    if (isSupported) {
      setPermission(getNotificationPermission());
      setEnabled(isNotificationEnabled());
    }
  }, [canUseDesktopNotifications]);

  if (!canUseDesktopNotifications || !supported || permission !== 'granted') return null;

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
