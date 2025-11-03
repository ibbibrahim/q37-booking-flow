# SignalR Real-Time Integration

This document explains the SignalR real-time functionality implemented in the Workflow Hub application.

## Overview

The application uses SignalR for real-time communication between different role views (Booking, NOC, Ingest, Admin). When a request is created, updated, or completed, all connected clients receive instant updates without needing to refresh.

## Architecture

### 1. SignalR Context (`src/contexts/SignalRContext.tsx`)

Provides a global SignalR connection with:
- **Auto-reconnect** with exponential backoff
- **Connection state management**
- **Event subscription** with automatic cleanup
- **Message broadcasting** to all connected clients

#### Usage:

```typescript
import { useSignalR } from './contexts/SignalRContext';

const { invoke, listen, isConnected } = useSignalR();

// Send a message
await invoke('RequestCreated', requestData);

// Listen for messages
useEffect(() => {
  const unsubscribe = listen('RequestCreated', (data) => {
    console.log('New request:', data);
  });

  return () => unsubscribe();
}, [listen]);
```

### 2. Toast Notifications (`src/contexts/ToastContext.tsx`)

Displays temporary toast notifications in the top-right corner:
- **Auto-dismiss** after 4 seconds
- **Multiple toast types**: success, error, info, warning
- **Smooth animations** with fade in/out

#### Usage:

```typescript
import { useToast } from './contexts/ToastContext';

const { showToast } = useToast();

showToast('Request created successfully', 'success');
showToast('Connection failed', 'error', 5000); // Custom duration
```

### 3. Notification System (`src/contexts/NotificationContext.tsx`)

Manages persistent notifications with:
- **Notification history** with read/unread status
- **Unread counter** for the bell icon
- **Automatic toast** on new notifications
- **Integration with SignalR** events

### 4. Notification Dropdown (`src/components/NotificationDropdown.tsx`)

UI component for displaying notifications:
- **Bell icon** with unread badge
- **Dropdown panel** with notification list
- **Mark as read** functionality
- **Clear notifications** option
- **Timestamp formatting** (e.g., "2m ago", "1h ago")

## SignalR Events

### Server Events (Broadcast to all clients):

| Event Name | Payload | Description |
|------------|---------|-------------|
| `RequestCreated` | `WorkflowRequest` | Fired when a new request is created |
| `RequestUpdated` | `WorkflowRequest` | Fired when a request is updated |
| `RequestCompleted` | `WorkflowRequest` | Fired when a request is marked as completed |

### Client Actions:

In `RoleView.tsx`, when a request is created:

```typescript
const newRequest = await mockApi.createRequest(data, status);
await invoke('RequestCreated', newRequest);
```

## Real-Time Features

### 1. Request List Auto-Update

When viewing any role dashboard (Booking, NOC, Ingest), the request list updates automatically when:
- A new request is created by another user
- An existing request is updated
- A request is marked as completed

No page refresh needed!

### 2. Live Notifications

The notification bell shows:
- **Unread count badge** on new events
- **Notification panel** with full history
- **Toast popups** for immediate feedback

Example notifications:
- 📡 New booking request received: {title}
- 🔄 Request updated: {title}
- ✅ Request marked as completed: {title}

### 3. Connection Status

The SignalR connection:
- **Automatically connects** on app load
- **Reconnects** on connection loss
- **Logs status** to browser console
- **Reattaches listeners** after reconnection

## Configuration

### Environment Variables

Add to your `.env` file:

```env
VITE_SIGNALR_HUB_URL=http://localhost:5000/workflowHub
```

For production, update the URL to your SignalR server endpoint.

### Backend Requirements

Your SignalR server should:
1. Host a hub at the configured URL (e.g., `/workflowHub`)
2. Accept connections from the frontend
3. Support broadcasting the following events:
   - `RequestCreated`
   - `RequestUpdated`
   - `RequestCompleted`

Example ASP.NET Core Hub:

```csharp
public class WorkflowHub : Hub
{
    public async Task RequestCreated(WorkflowRequest request)
    {
        await Clients.All.SendAsync("RequestCreated", request);
    }

    public async Task RequestUpdated(WorkflowRequest request)
    {
        await Clients.All.SendAsync("RequestUpdated", request);
    }

    public async Task RequestCompleted(WorkflowRequest request)
    {
        await Clients.All.SendAsync("RequestCompleted", request);
    }
}
```

## Testing

To test the real-time functionality:

1. Open the app in **two different browser windows** or tabs
2. In Window 1: Navigate to Booking view
3. In Window 2: Navigate to NOC view
4. In Window 1: Create a new request
5. **Observe**: Window 2 should instantly show the new request + notification

## Troubleshooting

### Connection Issues

If SignalR fails to connect:
1. Check browser console for error messages
2. Verify `VITE_SIGNALR_HUB_URL` is correct
3. Ensure backend SignalR server is running
4. Check CORS configuration on backend

### Events Not Received

If events aren't triggering:
1. Verify the hub method name matches (case-sensitive)
2. Check that `invoke()` is being called on request creation
3. Ensure listeners are set up before events are fired
4. Check browser console for SignalR logs

## Benefits

- **Zero refresh needed** - All updates happen in real-time
- **Better collaboration** - Multiple users see changes instantly
- **Immediate feedback** - Toast notifications confirm actions
- **Offline resilience** - Auto-reconnect when connection restored
- **Clean separation** - SignalR logic isolated in context providers
