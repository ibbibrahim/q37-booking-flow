const VERSION_URL = '/version.json';
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CHUNK_RELOAD_KEY = 'app_chunk_reload_attempted';

export const APP_BUILD_ID: string = __APP_BUILD_ID__;

export function isDevBuild(): boolean {
  return import.meta.env.DEV || APP_BUILD_ID === 'dev';
}

export async function fetchDeployedBuildId(): Promise<string | null> {
  try {
    const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { buildId?: string };
    return data.buildId ?? null;
  } catch {
    return null;
  }
}

export function reloadApp(): void {
  window.location.reload();
}

export function reloadOnceForChunkError(): void {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    return;
  }

  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  reloadApp();
}

function isChunkLoadError(message: string): boolean {
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk')
  );
}

export function registerChunkLoadRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnceForChunkError();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : '';

    if (isChunkLoadError(message)) {
      event.preventDefault();
      reloadOnceForChunkError();
    }
  });
}

export function startVersionPolling(onUpdateAvailable: () => void): () => void {
  if (isDevBuild()) {
    return () => undefined;
  }

  let stopped = false;

  const checkForUpdate = async () => {
    if (stopped) {
      return;
    }

    const deployedBuildId = await fetchDeployedBuildId();
    if (deployedBuildId && deployedBuildId !== APP_BUILD_ID) {
      onUpdateAvailable();
    }
  };

  const intervalId = window.setInterval(checkForUpdate, POLL_INTERVAL_MS);

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void checkForUpdate();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  void checkForUpdate();

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
