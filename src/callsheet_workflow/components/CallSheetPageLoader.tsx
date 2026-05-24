import React from 'react';

interface CallSheetPageLoaderProps {
  /** Shown below the spinner (matches App.tsx / analytics copy style). */
  message?: string;
  /** Wrapper classes; defaults to centered block with vertical padding like CallSheetAnalytics. */
  className?: string;
}

/**
 * Loading state pattern used elsewhere in the app (e.g. App.tsx auth, CallSheetAnalytics).
 */
export function CallSheetPageLoader({ message = 'Loading...', className }: CallSheetPageLoaderProps) {
  return (
    <div className={className ?? 'text-center py-12'} role="status" aria-busy="true" aria-label={message}>
      <div
        className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"
        aria-hidden
      />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
