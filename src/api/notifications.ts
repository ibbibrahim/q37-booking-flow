import apiClient from '@/utils/apiClient';

export interface NotificationDTO {
  id: number;
  title: string;
  body?: string;
  url: string;
  isRead: boolean;
  createdAt: string;
  entityType: string;
  entityId: number;
  actorUserId?: number;
  recipientUserId: number;
}

export interface NotificationListResponse {
  items: NotificationDTO[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface FetchNotificationsParams {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export const notificationsApi = {
  fetchNotifications: async (params: FetchNotificationsParams = {}): Promise<NotificationListResponse> => {
    const { unreadOnly = false, page = 1, pageSize = 20 } = params;
    const response = await apiClient.get<NotificationListResponse>('/api/notifications', {
      params: { unreadOnly, page, pageSize }
    });
    return response.data;
  },

  fetchUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>('/api/notifications/unread-count');
    return response.data.count;
  },

  markNotificationRead: async (id: number): Promise<void> => {
    await apiClient.patch(`/api/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.post('/api/notifications/mark-all-read');
  }
};
