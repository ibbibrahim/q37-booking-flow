# Database-Backed Notifications Implementation

## Overview
Implemented a complete database-backed notification system with real-time SignalR updates, deep-linking navigation, and infinite scroll pagination.

---

## Files Changed

### 1. **New File: `/src/api/notifications.ts`**
API client for notifications endpoints.

**Exports:**
- `NotificationDTO` interface - matches backend DTO shape
- `NotificationListResponse` interface - paginated response structure
- `notificationsApi` object with methods:
  - `fetchNotifications({ unreadOnly, page, pageSize })` - GET /api/notifications
  - `fetchUnreadCount()` - GET /api/notifications/unread-count
  - `markNotificationRead(id)` - PATCH /api/notifications/{id}/read
  - `markAllRead()` - POST /api/notifications/mark-all-read

**Usage:**
```typescript
import { notificationsApi } from '@/api/notifications';

const response = await notificationsApi.fetchNotifications({
  unreadOnly: false,
  page: 1,
  pageSize: 20
});
```

---

### 2. **Updated: `/src/contexts/NotificationContext.tsx`**
Refactored to use database-backed notifications instead of client-side only state.

**Key Changes:**

#### Interface Updates
- Changed `Notification` interface to match `NotificationDTO`:
  - `id: number` (was `string`)
  - `isRead: boolean` (was `read`)
  - Added: `url`, `createdAt`, `entityType`, `entityId`, `actorUserId`, `recipientUserId`
  - Optional: `body` and `message` (backward compatible)

- Updated `NotificationContextType`:
  - Added: `isLoading`, `hasMore`, `loadNotifications()`, `loadMore()`
  - Removed: `clearNotification()`, `clearAllNotifications()`
  - `markAsRead()` now takes `number` instead of `string`

#### State Management
```typescript
const [notifications, setNotifications] = useState<Notification[]>([]);
const [unreadCount, setUnreadCount] = useState<number>(0);
const [isLoading, setIsLoading] = useState<boolean>(false);
const [hasMore, setHasMore] = useState<boolean>(false);
const [currentPage, setCurrentPage] = useState<number>(1);
```

#### Initial Load
On mount, fetches:
1. Unread count from API
2. First page of notifications (20 items)

#### SignalR Integration
- **New:** Listens to `NotificationCreated` event from backend
- **Behavior:** When received:
  - Prepends notification to list
  - Increments unread count
  - Shows toast notification
- **Preserved:** All existing SignalR subscriptions (`RequestCreated`, `RequestUpdated`, etc.) still fire toasts

#### Optimistic Updates
- `markAsRead()`: Updates UI immediately, then calls API. Reverts on error.
- `markAllAsRead()`: Updates all notifications to read, sets count to 0, then calls API. Reverts on error.

#### Pagination
- `loadNotifications(page)`: Loads specific page (replaces list if page=1, appends otherwise)
- `loadMore()`: Loads next page if not already loading and more items exist

---

### 3. **Updated: `/src/components/NotificationDropdown.tsx`**
Refactored UI to support DB-backed notifications with navigation and infinite scroll.

**Key Changes:**

#### Added Imports
```typescript
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
```

#### Enhanced Time Formatting
```typescript
const formatTimestamp = (dateString: string) => {
  // Returns: "Just now", "5m ago", "2h ago", "3d ago", "2w ago", "3mo ago", or date
}
```

#### Icon Mapping by Entity Type
```typescript
const getNotificationIcon = (entityType: string) => {
  switch (entityType.toLowerCase()) {
    case 'bookingrequest': return '📡';
    case 'callsheet': return '📋';
    case 'acknowledgement': return '✅';
    case 'resources': return '🎬';
    default: return '📬';
  }
}
```

#### Navigation on Click
```typescript
const handleNotificationClick = async (notification) => {
  await markAsRead(notification.id);  // Mark as read
  if (notification.url) {
    navigate(notification.url);       // Navigate to URL
    setIsOpen(false);                 // Close dropdown
  }
};
```

#### UI Enhancements
- **Unread Indicator:** Blue dot + left border accent for unread notifications
- **Loading State:** Shows spinner when loading initial data
- **Empty State:** Shows bell icon with "No notifications yet"
- **Load More Button:** Appears when `hasMore === true`
  - Disabled during loading
  - Shows spinner when loading more items
- **Max Height:** Increased to 500px from 400px
- **Removed:** Individual notification delete buttons (notifications persist in DB)

#### Visual Hierarchy
```tsx
<div className={`px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${
  !notification.isRead ? 'bg-primary/5 border-l-2 border-l-primary' : ''
}`}>
  <div className="flex items-start gap-3">
    <span className="text-lg">{icon}</span>
    <div className="flex-1">
      <h4>{notification.title}</h4>
      {!notification.isRead && <span className="w-2 h-2 bg-primary rounded-full" />}
      <p className="text-xs">{notification.body}</p>
      <p className="text-xs opacity-70">{formatTimestamp(notification.createdAt)}</p>
    </div>
  </div>
</div>
```

---

## API Integration Flow

### On App Load
```
1. NotificationContext mounts
2. Fetches unread count → Updates badge
3. Fetches first 20 notifications → Displays in dropdown
```

### On Notification Click
```
1. User clicks notification
2. markAsRead(id) called → Optimistic UI update
3. PATCH /api/notifications/{id}/read → Backend marks as read
4. navigate(notification.url) → Routes to detail page
5. Dropdown closes
```

### On "Load More" Click
```
1. User clicks "Load more"
2. loadMore() called → Shows spinner on button
3. GET /api/notifications?page=2 → Fetches next 20
4. Appends to existing list
5. Updates hasMore flag
```

### On Real-Time Notification
```
1. Backend sends SignalR event: NotificationCreated
2. NotificationContext receives event
3. Prepends notification to list
4. Increments unread count
5. Shows toast message
6. Red badge updates automatically
```

### On "Mark All Read" Click
```
1. User clicks "Mark all read"
2. markAllAsRead() called → Optimistic update (all read, count=0)
3. POST /api/notifications/mark-all-read → Backend updates all
4. UI reflects changes immediately
```

---

## Backend Expectations

### Notification DTO Shape
```typescript
{
  id: number,
  title: string,
  body?: string,
  url: string,              // e.g., "/booking/requests/123"
  isRead: boolean,
  createdAt: string,        // ISO 8601 datetime
  entityType: string,       // "BookingRequest", "CallSheet", etc.
  entityId: number,
  actorUserId?: number,
  recipientUserId: number
}
```

### Paginated Response
```typescript
{
  items: NotificationDTO[],
  totalCount: number,
  page: number,
  pageSize: number,
  hasMore: boolean
}
```

### SignalR Event
```typescript
// Event name: "NotificationCreated"
// Payload: NotificationDTO
connection.on('NotificationCreated', (notification: NotificationDTO) => {
  // Frontend handles this automatically
});
```

---

## Migration Notes

### Backward Compatibility
- Existing SignalR events (`RequestCreated`, `RequestUpdated`, etc.) still work
- They now only trigger toast messages (not create notification items)
- This prevents duplicate notifications (DB + SignalR)

### Breaking Changes
- `Notification.id` is now `number` (was `string`)
- `Notification.read` is now `Notification.isRead`
- Removed `clearNotification()` and `clearAllNotifications()` methods
- Notifications persist in database (no client-side deletion)

### Non-Breaking Changes
- Added optional `body` field (backward compatible with `message`)
- Added new fields: `url`, `entityType`, `entityId`, etc.
- UI automatically handles both old and new notification structures

---

## Testing Checklist

### Manual Testing
- [ ] Badge shows correct unread count on page load
- [ ] Clicking notification marks it as read
- [ ] Clicking notification navigates to correct URL
- [ ] "Load more" button loads next page
- [ ] Real-time notifications appear instantly via SignalR
- [ ] "Mark all as read" updates all notifications
- [ ] Unread notifications have blue accent border
- [ ] Time formatting shows "Just now", "5m ago", etc.
- [ ] Empty state shows when no notifications exist
- [ ] Loading spinner shows during API calls

### API Testing
- [ ] GET /api/notifications returns paginated data
- [ ] GET /api/notifications/unread-count returns number
- [ ] PATCH /api/notifications/{id}/read updates isRead flag
- [ ] POST /api/notifications/mark-all-read updates all user notifications
- [ ] SignalR sends NotificationCreated event on new notification

---

## Performance Considerations

### Optimizations
- Loads only 20 notifications per page
- Infinite scroll prevents loading all notifications at once
- Optimistic updates for instant UI feedback
- Unread count cached in state (not re-fetched on every render)

### Potential Improvements
- Add pull-to-refresh for mobile
- Add notification sound/desktop notification
- Cache notifications in localStorage for offline viewing
- Add filter by entity type (BookingRequest, CallSheet, etc.)
- Add search functionality

---

## File Structure

```
src/
├── api/
│   └── notifications.ts              [NEW] API client
├── components/
│   └── NotificationDropdown.tsx      [UPDATED] UI component
├── contexts/
│   └── NotificationContext.tsx       [UPDATED] State management
└── utils/
    └── apiClient.ts                  [UNCHANGED] Axios instance
```

---

## Summary

Successfully implemented a production-ready notification system that:
- ✅ Fetches notifications from database API
- ✅ Shows real-time updates via SignalR
- ✅ Supports deep-linking navigation
- ✅ Implements infinite scroll pagination
- ✅ Provides optimistic UI updates
- ✅ Maintains backward compatibility with existing SignalR events
- ✅ Follows best practices for error handling and loading states
- ✅ Uses consistent styling with existing design system
