// Browser Push Notification Utilities

const NOTIFICATION_PERMISSION_KEY = 'notification_permission_requested';
const NOTIFICATION_ENABLED_KEY = 'notification_enabled';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied';

/**
 * Check if browser supports notifications
 */
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = (): NotificationPermissionStatus => {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission as NotificationPermissionStatus;
};

/**
 * Check if user has already been asked for permission
 */
export const hasRequestedPermission = (): boolean => {
  return localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === 'true';
};

/**
 * Mark that permission has been requested
 */
export const markPermissionRequested = (): void => {
  localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
};

/**
 * Check if user has enabled notifications in app settings
 */
export const isNotificationEnabled = (): boolean => {
  const enabled = localStorage.getItem(NOTIFICATION_ENABLED_KEY);
  return enabled === 'true';
};

/**
 * Set notification enabled/disabled in app settings
 */
export const setNotificationEnabled = (enabled: boolean): void => {
  localStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled.toString());
};

/**
 * Request notification permission from browser
 */
export const requestNotificationPermission = async (): Promise<NotificationPermissionStatus> => {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    markPermissionRequested();

    // Auto-enable if permission granted
    if (permission === 'granted') {
      setNotificationEnabled(true);
    }

    return permission as NotificationPermissionStatus;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

/**
 * Check if we should show browser notifications
 */
export const shouldShowBrowserNotification = (): boolean => {
  return (
    isNotificationSupported() &&
    getNotificationPermission() === 'granted' &&
    isNotificationEnabled()
  );
};

interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: unknown;
  onClick?: () => void;
  playSound?: boolean;
}

/**
 * Play notification sound
 */
const playNotificationSound = (): void => {
  try {
    // Create an audio context for the notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create oscillator for a pleasant notification sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure sound: two-tone beep
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // First tone: 800Hz
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1); // Second tone: 1000Hz

    // Fade in and out for smooth sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.25);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);

    // Clean up
    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

/**
 * Show a browser notification
 */
export const showBrowserNotification = (options: BrowserNotificationOptions): Notification | null => {
  if (!shouldShowBrowserNotification()) {
    return null;
  }

  try {
    // Play sound if requested
    if (options.playSound) {
      playNotificationSound();
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/Qbusiness_Logo_NEG_POS-02.png',
      tag: options.tag || 'booking-notification',
      badge: options.icon || '/Qbusiness_Logo_NEG_POS-02.png',
      requireInteraction: false,
      data: options.data,
      silent: false, // Enable browser's default sound
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      if (options.onClick) {
        options.onClick();
      }
      notification.close();
    };

    // Auto-close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);

    return notification;
  } catch (error) {
    console.error('Error showing browser notification:', error);
    return null;
  }
};

/**
 * Get instructions for enabling notifications in different browsers
 */
export const getNotificationInstructions = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('chrome')) {
    return 'Chrome > Settings > Privacy and security > Site Settings > Notifications';
  } else if (userAgent.includes('firefox')) {
    return 'Firefox > Settings > Privacy & Security > Permissions > Notifications';
  } else if (userAgent.includes('safari')) {
    return 'Safari > Preferences > Websites > Notifications';
  } else if (userAgent.includes('edge')) {
    return 'Edge > Settings > Cookies and site permissions > Notifications';
  }

  return 'Browser Settings > Site Settings > Notifications';
};
