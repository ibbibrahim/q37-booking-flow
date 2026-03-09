import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignalR } from './SignalRContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import type { WorkflowRequest } from '../booking_workflow/types/workflow';
import { notificationsApi, type NotificationDTO } from '../api/notifications';
import { shouldShowBrowserNotification, showBrowserNotification } from '../utils/browserNotifications';
import type { EditingRequest } from '../editing_reservation/types/editing';

export interface Notification {
  id: number;
  title: string;
  body?: string;
  message?: string;
  url: string;
  isRead: boolean;
  createdAt: string;
  entityType: string;
  entityId: number;
  actorUserId?: number;
  recipientUserId: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  loadNotifications: (page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { listen, isConnected } = useSignalR();
  const { showToast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setHasMore(false);
      setCurrentPage(1);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const count = await notificationsApi.fetchUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    const loadInitialNotifications = async () => {
      setIsLoading(true);
      try {
        const response = await notificationsApi.fetchNotifications({
          unreadOnly: false,
          page: 1,
          pageSize: 4
        });

        const mappedNotifications: Notification[] = response.items.map(item => ({
          id: item.id,
          title: item.title,
          body: item.body,
          message: item.body,
          url: item.url,
          isRead: item.isRead,
          createdAt: item.createdAt,
          entityType: item.entityType,
          entityId: item.entityId,
          actorUserId: item.actorUserId,
          recipientUserId: item.recipientUserId
        }));

        setNotifications(mappedNotifications);
        setHasMore(response.hasMore);
        setCurrentPage(1);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnreadCount();
    loadInitialNotifications();
  }, [authLoading, isAuthenticated]);

  const loadNotifications = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await notificationsApi.fetchNotifications({
        unreadOnly: false,
        page,
        pageSize: 4
      });

      const mappedNotifications: Notification[] = response.items.map(item => ({
        id: item.id,
        title: item.title,
        body: item.body,
        message: item.body,
        url: item.url,
        isRead: item.isRead,
        createdAt: item.createdAt,
        entityType: item.entityType,
        entityId: item.entityId,
        actorUserId: item.actorUserId,
        recipientUserId: item.recipientUserId
      }));

      if (page === 1) {
        setNotifications(mappedNotifications);
      } else {
        setNotifications(prev => [...prev, ...mappedNotifications]);
      }

      setHasMore(response.hasMore);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!isLoading && hasMore) {
      await loadNotifications(currentPage + 1);
    }
  }, [isLoading, hasMore, currentPage, loadNotifications]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const unsubscribeNotificationCreated = listen('NotificationCreated', (data: NotificationDTO) => {
      const notification: Notification = {
        id: data.id,
        title: data.title,
        body: data.body,
        message: data.body,
        url: data.url,
        isRead: data.isRead,
        createdAt: data.createdAt,
        entityType: data.entityType,
        entityId: data.entityId,
        actorUserId: data.actorUserId,
        recipientUserId: data.recipientUserId
      };

      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      //showToast(`📬 ${data.title}`, 'info');

      // Browser notification for Ingest users
      const isIngestUser = user?.roles?.includes('Ingest') || false;

      if (isIngestUser && shouldShowBrowserNotification()) {
        showBrowserNotification({
          title: data.title,
          body: data.body || 'You have a new notification',
          icon: '/Qbusiness_Logo_NEG_POS-02.png',
          tag: `notification-${data.id}`,
          playSound: true,
          onClick: () => {
            window.focus();
            if (data.url) {
              navigate(data.url);
            } else {
              navigate('/ingest');
            }
          }
        });
      }
    });

    const unsubscribeCreated = listen('RequestCreated', (data: WorkflowRequest) => {
      //showToast(`📡 New booking request received: ${data.title}`, 'info');
    });

    const unsubscribeUpdated = listen('RequestUpdated', (data: WorkflowRequest) => {
      //showToast(`✅ Request updated: ${data.title}`, 'success');
    });

    const unsubscribeCompleted = listen('RequestCompleted', (data: WorkflowRequest) => {
      //showToast(`✅ Request marked as completed: ${data.title}`, 'success');
    });

    const unsubscribeNotDone = listen('RequestNotDone', (data: WorkflowRequest) => {
      //showToast(`⚠️ Request marked as NOT DONE: ${data.title}`, 'error');
    });

    const unsubscribeResourcesAssigned = listen('ResourcesAssigned', (data: WorkflowRequest) => {
      //showToast(`🎬 Resources assigned: ${data.title}`, 'info');
    });

    const unsubscribeCallSheetCreated = listen('CallSheetCreated', (data: any) => {
      //showToast(`📋 New call sheet created: ${data.title}`, 'info');
    });

    const unsubscribeCallSheetUpdated = listen('CallSheetUpdatedByTechnicalStore', (data: any) => {
      //showToast(`🚗 Driver assigned: ${data.title}`, 'success');
    });

    // Editing request listeners
    const unsubscribeEditingCreated = listen('EditingRequestCreated', (data: EditingRequest) => {
      showToast(`📝 New edit reservation: ${data.programName}`, 'info');
      const isEditorUser = user?.roles?.includes('Editor') || user?.roles?.includes('Admin');
      if (isEditorUser && shouldShowBrowserNotification()) {
        showBrowserNotification({
          title: 'New Edit Reservation Request',
          body: data.programName,
          icon: '/Qbusiness_Logo_NEG_POS-02.png',
          tag: `editing-${data.id}`,
          playSound: true,
          onClick: () => {
            window.focus();
            navigate('/editor-queue');
          }
        });
      }
    });

    const unsubscribeEditingUpdated = listen('EditingRequestUpdated', (data: EditingRequest) => {
      showToast(`✅ Edit reservation confirmed: ${data.programName}`, 'success');
    });

    const unsubscribeEditingCancelled = listen('EditingRequestCancelled', (data: EditingRequest) => {
      showToast(`❌ Edit reservation cancelled: ${data.programName}`, 'error');
    });

    return () => {
      unsubscribeNotificationCreated();
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeCompleted();
      unsubscribeResourcesAssigned();
      unsubscribeNotDone();
      unsubscribeCallSheetCreated();
      unsubscribeCallSheetUpdated();
      unsubscribeEditingCreated();
      unsubscribeEditingUpdated();
      unsubscribeEditingCancelled();
    };
  }, [isConnected, listen, showToast, user, navigate]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif))
      );

      const wasUnread = notifications.find(n => n.id === id && !n.isRead);
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      await notificationsApi.markNotificationRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === id ? { ...notif, isRead: false } : notif))
      );
      if (notifications.find(n => n.id === id && !n.isRead)) {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      const previousNotifications = [...notifications];
      const previousUnreadCount = unreadCount;

      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
      setUnreadCount(0);

      await notificationsApi.markAllRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  }, [notifications, unreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        markAsRead,
        markAllAsRead,
        loadNotifications,
        loadMore,
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