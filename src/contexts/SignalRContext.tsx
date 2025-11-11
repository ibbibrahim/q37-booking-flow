import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { UserRole } from '../booking_workflow/types/workflow';

interface SignalRContextType {
  invoke: (eventName: string, payload?: any) => Promise<void>;
  listen: (eventName: string, handler: (data: any) => void) => void;
  connectionState: signalR.HubConnectionState;
  isConnected: boolean;
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectionState, setConnectionState] = useState<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const setupConnection = useCallback(() => {
    // 🟢 Detect role from URL path
    const path = window.location.pathname.toLowerCase();
    let role: UserRole = 'Booking';
    if (path.includes('/noc')) role = 'NOC';
    else if (path.includes('/ingest')) role = 'Ingest';
    else if (path.includes('/admin')) role = 'Admin';
    else if (path.includes('/callsheet')) role = 'Callsheet';
    else role = 'Booking';

    // 🟡 TODO: later, replace this detection with actual user role from auth/user context

    // Determine hub URL with fallback to localhost for dev
    const baseHubUrl =
      import.meta.env.VITE_SIGNALR_HUB_URL?.trim() ||
      'https://draughtier-maritime-dacia.ngrok-free.dev/workflowHub';

    const hubUrl = `${baseHubUrl}?role=${role}`;

    console.log(`Connecting to SignalR hub as role: ${role}`);
    console.log(`Hub URL: ${hubUrl}`);

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
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
      reconnectTimeoutRef.current = setTimeout(() => {
        startConnection(connection);
      }, 5000);
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
  }, []);

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

  useEffect(() => {
    const connection = setupConnection();
    startConnection(connection);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
      listenersRef.current.clear();
    };
  }, [setupConnection]);

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
