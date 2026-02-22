# Browser Push Notifications Implementation

## Overview

This implementation adds browser push notifications for **Ingest team users only**, alerting them when new booking requests arrive even when the browser tab is in the background or minimized.

## Features Implemented

### 1. Notification Permission Request
- **Location**: `src/components/NotificationPermissionBanner.tsx`
- **Behavior**:
  - Shows a friendly banner when an Ingest user logs in for the first time
  - Only displays for users with the "Ingest" role
  - Asks for permission: "Enable Desktop Notifications"
  - Stores permission status in localStorage to avoid repeated prompts
  - Shows instructions if user denies permission

### 2. Browser Notification Utilities
- **Location**: `src/utils/browserNotifications.ts`
- **Functions**:
  - `isNotificationSupported()` - Checks if browser supports notifications
  - `getNotificationPermission()` - Gets current permission status
  - `requestNotificationPermission()` - Requests permission from browser
  - `shouldShowBrowserNotification()` - Checks if notifications should be shown
  - `showBrowserNotification()` - Displays a browser notification
  - `getNotificationInstructions()` - Provides browser-specific instructions

### 3. SignalR Integration
- **Location**: `src/contexts/SignalRContext.tsx`
- **Behavior**:
  - Listens to the existing `RequestCreated` SignalR event
  - Only for Ingest users with notification permission granted
  - Shows notification with:
    - Title: "New Booking Request"
    - Body: Request title or program segment
    - Icon: App logo
    - System notification sound (automatic)
  - Clicking notification focuses window and navigates to request
  - Does NOT show notification if user is already on the booking page with focus

### 4. Notification Settings Toggle
- **Location**: `src/components/NotificationSettings.tsx`
- **Behavior**:
  - Shows a settings card for Ingest users
  - Toggle to enable/disable notifications
  - Preference stored in localStorage
  - Shows permission status and instructions
  - Only visible to Ingest users

### 5. UI Integration
- **NotificationPermissionBanner** added to `BookingDashboard` component
- **NotificationSettings** added to `RequestList` for Ingest users
- Banner appears at top-right when permission needed
- Settings card appears at top of Ingest queue

## Permission States Handled

1. **default** (not asked yet):
   - Shows "Enable Notifications" button
   - Clicking requests permission

2. **granted**:
   - Notifications enabled
   - Shows toggle in settings
   - Success message displayed

3. **denied**:
   - Shows instructions to enable in browser settings
   - Provides browser-specific guidance
   - No repeated prompts

4. **not supported**:
   - Shows message: "Desktop notifications not supported in this browser"
   - Doesn't break the app

## User Flow

### For Ingest Users:

1. **First Login**:
   - Banner appears asking to enable notifications
   - User clicks "Enable Notifications"
   - Browser prompts for permission
   - User allows or denies

2. **If Allowed**:
   - Success message displayed
   - Preference saved in localStorage
   - Notifications start working immediately

3. **Receiving Notifications**:
   - New booking request arrives via SignalR
   - If not on booking page OR page not focused:
     - Browser notification pops up with sound
     - Shows request title
   - Click notification:
     - Browser window focuses
     - Navigates to booking detail or dashboard

4. **Managing Notifications**:
   - Go to Ingest dashboard
   - See NotificationSettings card at top
   - Toggle on/off as needed
   - Changes saved immediately

### For Non-Ingest Users:
- No banner appears
- No settings visible
- Feature completely hidden

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (desktop)
- Firefox (desktop)
- Safari (macOS)
- Requires HTTPS (already configured)

## Technical Details

### localStorage Keys:
- `notification_permission_requested`: Tracks if permission was asked
- `notification_enabled`: User's preference for notifications

### SignalR Event:
- Listens to: `RequestCreated`
- Only triggers for Ingest users
- Only when permission granted AND toggle enabled

### Security:
- Only uses existing SignalR connection
- No new network requests
- Permission required from user
- Notifications only for authenticated Ingest users

## Testing Checklist

- [x] Notification permission request shows for Ingest users only
- [x] Permission prompt works correctly
- [x] Settings toggle appears in Ingest dashboard
- [x] Browser notification displays when new request arrives
- [x] Notification includes correct title and body
- [x] Clicking notification navigates to correct page
- [x] No notification if user is on booking page with focus
- [x] localStorage preferences persist across sessions
- [x] Denied permission shows instructions
- [x] Non-Ingest users see nothing

## Files Modified

1. `/src/utils/browserNotifications.ts` - NEW
2. `/src/components/NotificationPermissionBanner.tsx` - NEW
3. `/src/components/NotificationSettings.tsx` - NEW
4. `/src/contexts/SignalRContext.tsx` - MODIFIED
5. `/src/booking_workflow/components/BookingDashboard.tsx` - MODIFIED
6. `/src/booking_workflow/components/RequestList.tsx` - MODIFIED

## No Breaking Changes

- All changes are additive
- No existing functionality affected
- Works alongside existing bell icon notifications
- Gracefully degrades if browser doesn't support notifications

## Future Enhancements (Not Implemented)

- Notification history
- Custom notification sounds
- Notification preferences per booking type
- Snooze/mute functionality
- Desktop notification badges with counts
