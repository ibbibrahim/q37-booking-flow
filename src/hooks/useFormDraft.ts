import { useCallback, useEffect, useRef, useState } from 'react';

const DRAFT_VERSION = 1;
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredDraft<T> {
  v: number;
  savedAt: string;
  data: T;
}

export interface FormDraft<T> {
  data: T;
  savedAt: string;
}

interface UseFormDraftOptions {
  enabled?: boolean;
  debounceMs?: number;
  /** Show the native "Leave site?" prompt while `enabled` (works with key = null). */
  warnBeforeUnload?: boolean;
}

export function readFormDraft<T>(key: string | null): FormDraft<T> | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || parsed.v !== DRAFT_VERSION || !parsed.savedAt || parsed.data === undefined) {
      return null;
    }
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (!Number.isFinite(age) || age > MAX_DRAFT_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return { data: parsed.data, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

/**
 * Autosaves a form snapshot to localStorage (debounced), exposes any draft found on mount,
 * and warns the browser before unload while `enabled` is true.
 * Pass `key = null` to disable the hook entirely.
 */
export function useFormDraft<T>(
  key: string | null,
  value: T,
  opts: UseFormDraftOptions = {},
) {
  const { enabled = true, debounceMs = 600, warnBeforeUnload = false } = opts;

  const [initialDraft] = useState<FormDraft<T> | null>(() => readFormDraft<T>(key));
  const [savedAt, setSavedAt] = useState<Date | null>(() =>
    initialDraft ? new Date(initialDraft.savedAt) : null,
  );

  const serialized = JSON.stringify(value);
  const keyRef = useRef(key);
  const serializedRef = useRef(serialized);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const clearedRef = useRef(false);
  const wasEnabledRef = useRef(false);

  keyRef.current = key;
  serializedRef.current = serialized;

  const writeNow = useCallback(() => {
    const k = keyRef.current;
    if (!k) return;
    try {
      const now = new Date();
      const payload = `{"v":${DRAFT_VERSION},"savedAt":${JSON.stringify(now.toISOString())},"data":${serializedRef.current}}`;
      localStorage.setItem(k, payload);
      setSavedAt(now);
    } catch {
      // Quota exceeded or storage unavailable (private mode) - draft is best-effort.
    }
  }, []);

  const cancelTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = false;
  }, []);

  // Debounced write on change. A new value re-enables saving after clear().
  useEffect(() => {
    if (!key || !enabled) {
      cancelTimer();
      // Form went from dirty back to pristine (user undid everything): drop the stale draft.
      if (wasEnabledRef.current && key) {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
        setSavedAt(null);
      }
      wasEnabledRef.current = false;
      return;
    }
    wasEnabledRef.current = true;
    clearedRef.current = false;
    pendingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      pendingRef.current = false;
      writeNow();
    }, debounceMs);
  }, [key, enabled, serialized, debounceMs, writeNow, cancelTimer]);

  // Flush a pending write on pagehide and unmount (unless the draft was cleared).
  useEffect(() => {
    const flush = () => {
      if (pendingRef.current && !clearedRef.current) {
        cancelTimer();
        writeNow();
      }
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [writeNow, cancelTimer]);

  // Native "Leave site?" prompt while there are unsaved changes.
  useEffect(() => {
    if (!enabled || !warnBeforeUnload) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled, warnBeforeUnload]);

  const clear = useCallback(() => {
    clearedRef.current = true;
    cancelTimer();
    const k = keyRef.current;
    if (k) {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    }
    setSavedAt(null);
  }, [cancelTimer]);

  return { initialDraft, savedAt, clear };
}
