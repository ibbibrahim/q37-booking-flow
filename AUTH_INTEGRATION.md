# Authentication Integration Guide

## Overview
JWT-based authentication has been integrated into the QTV37 Workflow Management System. The system now requires users to log in before accessing any protected routes.

## Backend Configuration
- **Base URL**: `https://localhost:7151/api` (configurable via `VITE_API_BASE_URL` env variable)
- **Login Endpoint**: `POST /api/users/login`
- **Request Body**: `{ "username": "string", "password": "string" }`
- **Response**: `{ "token": "JWT_TOKEN_STRING" }`

## User Roles & Access Control

### Role Hierarchy
1. **Booking** - Access to booking workflow only
2. **NOC** - Access to NOC workflow only
3. **Ingest** - Access to ingest workflow only
4. **Admin** - Full access to all routes and workflows

### Route Permissions
- `/booking/*` - Booking, Admin
- `/noc/*` - NOC, Admin
- `/ingest/*` - Ingest, Admin
- `/admin/*` - Admin only
- `/callsheet/*` - All authenticated users

## Architecture

### New Components
1. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - Manages authentication state
   - Handles login/logout operations
   - Stores JWT token and user data in localStorage
   - Auto-restores auth state on app reload

2. **Login Page** (`src/components/Login.tsx`)
   - Clean, modern login interface
   - Matches existing design system
   - Error handling with user feedback
   - Loading states during authentication

3. **ProtectedRoute** (`src/components/ProtectedRoute.tsx`)
   - Wrapper component for protected routes
   - Redirects unauthenticated users to login
   - Enforces role-based access control
   - Shows loading spinner during auth check

4. **Unauthorized Page** (`src/components/Unauthorized.tsx`)
   - Displayed when user lacks required permissions
   - Provides navigation options

### Updated Components
1. **API Client** (`src/utils/apiClient.ts`)
   - Request interceptor: Automatically adds `Authorization: Bearer <token>` header
   - Response interceptor: Handles 401 errors (auto-logout and redirect to login)
   - Base URL updated to backend API

2. **BookingDashboard** (`src/booking_workflow/components/BookingDashboard.tsx`)
   - Added user menu dropdown in header
   - Displays current username and role
   - Logout functionality

3. **App.tsx**
   - Integrated ProtectedRoute wrapper
   - Added login and unauthorized routes
   - Role-based route protection

4. **main.tsx**
   - AuthProvider added to context hierarchy

## Authentication Flow

### Login Process
1. User enters username and password
2. Credentials sent to `/api/users/login`
3. Backend validates and returns JWT token
4. Token payload decoded to extract username and role
5. Token and user data stored in localStorage
6. User redirected to `/booking` dashboard
7. All subsequent API requests include JWT in Authorization header

### Auto-Login
- On app load, AuthContext checks localStorage for existing token
- If found, restores authentication state
- Token automatically included in API requests

### Logout Process
1. User clicks "Sign Out" from user menu
2. Token and user data removed from localStorage
3. Authorization header removed from API client
4. User redirected to login page

### Session Management
- Token stored in localStorage persists across browser sessions
- 401 responses automatically trigger logout and redirect to login
- No automatic token refresh (add if needed)

## Security Features

✅ **JWT Token Validation**
- Token stored securely in localStorage
- Automatic inclusion in all API requests
- Server-side validation on every request

✅ **Role-Based Access Control**
- Route-level protection with ProtectedRoute component
- Admin role has universal access
- Unauthorized access redirects to appropriate page

✅ **Automatic Session Handling**
- 401 responses trigger automatic logout
- Expired tokens handled gracefully
- User redirected to login on session expiration

✅ **Secure API Communication**
- All requests use HTTPS (localhost:7151)
- Authorization header managed by interceptors
- No credentials exposed in URLs

## Testing

### Test Users (Backend Configuration Required)
Create test users with different roles:
- `booking_user` - Booking role
- `noc_user` - NOC role
- `ingest_user` - Ingest role
- `admin_user` - Admin role

### Manual Testing Checklist
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error handling)
- [ ] Access allowed route for user role
- [ ] Attempt to access forbidden route (unauthorized page)
- [ ] Admin can access all routes
- [ ] Logout functionality
- [ ] Session persistence (refresh page while logged in)
- [ ] Auto-logout on 401 response
- [ ] Protected routes redirect to login when not authenticated

## Environment Variables

Create `.env` file in project root:
```env
VITE_API_BASE_URL=https://localhost:7151/api
```

## No Breaking Changes

✅ All existing functionality preserved:
- SignalR real-time connections
- Theme switching (light/dark mode)
- Toast notifications
- Notification dropdown
- All workflow operations
- Call sheet management

✅ All existing contexts maintained:
- ThemeContext
- SignalRContext
- ToastContext
- NotificationContext

## Future Enhancements

Consider implementing:
- Token refresh mechanism
- Remember me functionality
- Password recovery flow
- Multi-factor authentication
- Session timeout warnings
- Audit logging
