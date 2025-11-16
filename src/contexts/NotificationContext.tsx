import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSignalR } from './SignalRContext';
import { useToast } from './ToastContext';
import type { WorkflowRequest } from '../booking_workflow/types/workflow';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: 'request_created' | 'request_updated' | 'request_completed';
  read: boolean;
  requestId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { listen, isConnected } = useSignalR();
  const { showToast } = useToast();

  useEffect(() => {
    // Don't subscribe if not connected
    if (!isConnected) {
      return;
    }

    const unsubscribeCreated = listen('RequestCreated', (data: WorkflowRequest) => {
      const notification: Notification = {
        id: `notif-${Date.now()}-${Math.random()}`,
        title: 'New Request Created',
        message: `${data.bookingType}: ${data.title}`,
        timestamp: new Date(),
        type: 'request_created',
        read: false,
        requestId: data.id,
      };

      setNotifications((prev) => [notification, ...prev]);
      showToast(`📡 New booking request received: ${data.title}`, 'info');
    });

    const unsubscribeUpdated = listen('RequestUpdated', (data: WorkflowRequest) => {
      const notification: Notification = {
        id: `notif-${Date.now()}-${Math.random()}`,
        title: 'Request Acknowledged',
        message: `${data.bookingType}: ${data.title} - Request Acknowledged`,
        timestamp: new Date(),
        type: 'request_updated',
        read: false,
        requestId: data.id,
      };

      setNotifications((prev) => [notification, ...prev]);
      showToast(`✅ Request updated: ${data.title}`, 'success');
    });

    // Completed
    const unsubscribeCompleted = listen('RequestCompleted', (data: WorkflowRequest) => {
      const notification: Notification = {
        id: `notif-${Date.now()}-${Math.random()}`,
        title: 'Request Completed',
        message: `${data.bookingType}: ${data.title}`,
        timestamp: new Date(),
        type: 'request_completed',
        read: false,
        requestId: data.id,
      };

      setNotifications((prev) => [notification, ...prev]);
      showToast(`✅ Request marked as completed: ${data.title}`, 'success');
    });

    // Not Done
    const unsubscribeNotDone = listen('RequestNotDone', (data: WorkflowRequest) => {
      const notification: Notification = {
        id: `notif-${Date.now()}-${Math.random()}`,
        title: 'Request Not Done',
        message: `${data.bookingType}: ${data.title} - Reason: ${data.comment || 'No reason provided'}`,
        timestamp: new Date(),
        type: 'request_updated',
        read: false,
        requestId: data.id,
      };

      setNotifications((prev) => [notification, ...prev]);
      showToast(`⚠️ Request marked as NOT DONE: ${data.title}`, 'error');
    });

    const unsubscribeResourcesAssigned = listen('ResourcesAssigned', (data: WorkflowRequest) => {
      const notification: Notification = {
        id: `notif-${Date.now()}-${Math.random()}`,
        title: 'Resources Assigned',
        message: `${data.bookingType}: ${data.title} is now ready for Ingest`,
        timestamp: new Date(),
        type: 'request_updated', // or add a new type like 'resources_assigned'
        read: false,
        requestId: data.id,
      };
    
      setNotifications((prev) => [notification, ...prev]);
      showToast(`🎬 Resources assigned: ${data.title}`, 'info');
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeCompleted();
      unsubscribeResourcesAssigned();
      unsubscribeNotDone();
    };
  }, [isConnected, listen, showToast]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
