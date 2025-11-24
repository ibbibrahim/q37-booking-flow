import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
        );
      case 'error':
        return (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
        );
      case 'warning':
        return (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <Info className="w-5 h-5 text-white" />
          </div>
        );
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-white dark:bg-slate-800 border-l-4 border-l-green-500 shadow-xl';
      case 'error':
        return 'bg-white dark:bg-slate-800 border-l-4 border-l-red-500 shadow-xl';
      case 'warning':
        return 'bg-white dark:bg-slate-800 border-l-4 border-l-yellow-500 shadow-xl';
      default:
        return 'bg-white dark:bg-slate-800 border-l-4 border-l-blue-500 shadow-xl';
    }
  };

  const getProgressBarColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto relative flex items-start gap-3 min-w-[360px] max-w-md p-4 pr-12 rounded-lg overflow-hidden animate-in slide-in-from-right duration-300 ${getToastStyles(
              toast.type
            )}`}
          >
            {getToastIcon(toast.type)}
            <div className="flex-1">
              <p className="text-sm font-medium text-card-foreground leading-tight mb-0.5">
                {toast.type === 'success' && 'Success'}
                {toast.type === 'error' && 'Error'}
                {toast.type === 'warning' && 'Warning'}
                {toast.type === 'info' && 'Information'}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-card-foreground transition-colors rounded-full p-1 hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
            <div
              className={`absolute bottom-0 left-0 h-1 ${getProgressBarColor(toast.type)}`}
              style={{
                animation: `shrink ${toast.duration}ms linear forwards`,
              }}
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
