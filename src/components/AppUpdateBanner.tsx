import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reloadApp, startVersionPolling } from '@/lib/appVersion';

export function AppUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    return startVersionPolling(() => {
      setUpdateAvailable(true);
    });
  }, []);

  useEffect(() => {
    if (!updateAvailable) {
      return;
    }

    const reloadWhenTabVisible = () => {
      if (document.visibilityState === 'visible') {
        reloadApp();
      }
    };

    document.addEventListener('visibilitychange', reloadWhenTabVisible);
    return () => document.removeEventListener('visibilitychange', reloadWhenTabVisible);
  }, [updateAvailable]);

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b border-primary/20 bg-primary px-4 py-3 text-primary-foreground shadow-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          A new version of the app is available. Refresh to get the latest changes.
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0"
          onClick={reloadApp}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh now
        </Button>
      </div>
    </div>
  );
}
