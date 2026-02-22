import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { UserRole } from '../booking_workflow/types/workflow';
import { useAuth } from './AuthContext';
import { showBrowserNotification, shouldShowBrowserNotification } from '@/utils/browserNotifications';
import { useNavigate } from 'react-router-dom';

interface SignalRContextType {
  invoke: (eventName: string, payload?: any) => Promise<void>;
  listen: (eventName: string, handler: (data: any) => void) => void;
  connectionState: signalR.HubConnectionState;
  isConnected: boolean;
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, token } = useAuth();
  const navigate = useNavigate();
  const [connectionState, setConnectionState] = useState<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isAuthenticatedRef = useRef<boolean>(isAuthenticated);

  // Keep track of authentication state in a ref so it's accessible in callbacks
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Define listen function early so it can be used in other hooks
  const listen = useCallback((eventName: string, handler: (data: any) => void) => {
    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, new Set());
    }

    const handlers = listenersRef.current.get(eventName)!;
    handlers.add(handler);

    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      connectionRef.current.on(eventName, handler);
    }

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        listenersRef.current.delete(eventName);
      }

      if (connectionRef.current) {
        connectionRef.current.off(eventName, handler);
      }
    };
  }, []);

  const getPrimaryRole = useCallback((): UserRole => {
    if (!user || !user.roles || user.roles.length === 0) {
      return 'Booking';
    }

    const roleArray = user.roles;
    if (roleArray.includes('Admin')) return 'Admin';
    if (roleArray.includes('NOC')) return 'NOC';
    if (roleArray.includes('Ingest')) return 'Ingest';
    if (roleArray.includes('TechnicalStore')) return 'TechnicalStore' as UserRole;
    if (roleArray.includes('Callsheet')) return 'Callsheet';
    return 'Booking';
  }, [user]);

  const setupConnection = useCallback(() => {
    const role = getPrimaryRole();

    // Determine hub URL with fallback to localhost for dev
    const baseHubUrl =
      import.meta.env.VITE_SIGNALR_HUB_URL?.trim() ||
      'https://qtv37-workflow-api-hjf6ctanamguc0h6.qatarcentral-01.azurewebsites.net/workflowHub';

    const hubUrl = `${baseHubUrl}?role=${role}`;

    console.log(`Connecting to SignalR hub as role: ${role}`);
    console.log(`Hub URL: ${hubUrl}`);

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token || "",
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.elapsedMilliseconds < 60000) {
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 10000);
          } else {
            return null;
          }
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.onclose((error) => {
      console.log('SignalR connection closed', error);
      setConnectionState(signalR.HubConnectionState.Disconnected);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Only attempt to reconnect if user is still authenticated
      if (isAuthenticatedRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          startConnection(connection);
        }, 5000);
      }
    });

    connection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      setConnectionState(signalR.HubConnectionState.Reconnecting);
    });

    connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected', connectionId);
      setConnectionState(signalR.HubConnectionState.Connected);
      reattachListeners(connection);
    });

    connectionRef.current = connection;
    return connection;
  }, [getPrimaryRole,token]);

  const reattachListeners = (connection: signalR.HubConnection) => {
    listenersRef.current.forEach((handlers, eventName) => {
      handlers.forEach((handler) => {
        connection.on(eventName, handler);
      });
    });
  };

  const startConnection = async (connection: signalR.HubConnection) => {
    try {
      await connection.start();
      console.log('SignalR connected successfully');
      setConnectionState(connection.state);
      reattachListeners(connection);
    } catch (error) {
      console.error('SignalR connection failed:', error);
      setConnectionState(signalR.HubConnectionState.Disconnected);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        startConnection(connection);
      }, 5000);
    }
  };

  // Setup browser notifications for Ingest users
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Only setup browser notifications for Ingest users
    const isIngestUser = user.roles?.includes('Ingest') || false;
    if (!isIngestUser) {
      return;
    }

    // Check if we should show browser notifications
    if (!shouldShowBrowserNotification()) {
      return;
    }

    // Listen for new booking requests
    const handleNewRequest = (data: any) => {
      // Always show browser notification with sound, even if user is on the booking page
      // This ensures notifications work across different PCs or browser tabs
      showBrowserNotification({
        title: 'New Booking Request',
        body: data.title || data.programSegment || 'A new booking request has arrived',
        tag: `booking-${data.id}`,
        data: data,
        playSound: true, // Always play sound for new requests
        onClick: () => {
          // Navigate to booking dashboard or detail page
          if (data.id) {
            navigate(`/booking/${data.id}`);
          } else {
            navigate('/booking');
          }
        },
      });
    };

    // Add listener
    const unsubscribe = listen('RequestCreated', handleNewRequest);

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user, listen, navigate]);

  useEffect(() => {
    const isOnLoginPage = window.location.pathname === '/login';

    // Only connect if authenticated and not on login page
    if (!isAuthenticated || isOnLoginPage) {
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }

      // Cleanup existing connection if user logs out
      if (connectionRef.current && connectionRef.current.state !== signalR.HubConnectionState.Disconnected) {
        connectionRef.current.stop().catch(err => console.log('Error stopping connection:', err));
      }

      // Clear all stale listeners when user logs out to prevent reattaching dead handlers
      listenersRef.current.clear();
      return;
    }

    const connection = setupConnection();
    startConnection(connection);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
      if (connectionRef.current) {
        connectionRef.current.stop().catch(err => console.log('Error stopping connection:', err));
      }
      listenersRef.current.clear();
    };
  }, [isAuthenticated, user, setupConnection]);

  const invoke = useCallback(async (eventName: string, payload?: any) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) {
      console.warn('SignalR not connected. Cannot invoke:', eventName);
      return;
    }

    try {
      await connectionRef.current.invoke(eventName, payload);
      console.log(`SignalR invoked: ${eventName}`, payload);
    } catch (error) {
      console.error(`SignalR invoke failed: ${eventName}`, error);
      throw error;
    }
  }, []);

  const isConnected = connectionState === signalR.HubConnectionState.Connected;

  return (
    <SignalRContext.Provider value={{ invoke, listen, connectionState, isConnected }}>
      {children}
    </SignalRContext.Provider>
  );
};

export const useSignalR = (): SignalRContextType => {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error('useSignalR must be used within SignalRProvider');
  }
  return context;
};