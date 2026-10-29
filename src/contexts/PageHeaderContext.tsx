import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface PageHeaderValue {
  title: string | null;
  subtitle: string | null;
}

interface PageHeaderContextValue extends PageHeaderValue {
  setHeader: (value: PageHeaderValue) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

/** Wraps the main app shell. The shell's own top bar reads the current
 * value; individual pages set it via usePageHeader() instead of rendering
 * their own duplicate <h1> — one header per screen instead of two. */
export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeaderValue>({ title: null, subtitle: null });
  const value = useMemo(() => ({ ...header, setHeader }), [header]);
  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

function usePageHeaderContext(): PageHeaderContextValue {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error('usePageHeaderContext must be used within a PageHeaderProvider');
  return ctx;
}

/** Read by the shell's top bar. Returns { title: null, subtitle: null }
 * until the current page calls usePageHeader(), so the shell can fall back
 * to its own default for any screen that hasn't adopted this yet. */
export function usePageHeaderValue(): PageHeaderValue {
  const { title, subtitle } = usePageHeaderContext();
  return { title, subtitle };
}

/** Call once near the top of a page component to set the shared top-bar
 * title/subtitle for as long as it's mounted — supports a fully dynamic
 * subtitle (e.g. one built from fetched data) since it re-applies whenever
 * the arguments change, not just once on mount. Resets to null on unmount
 * so a stale title never lingers after navigating away. */
export function usePageHeader(title: string, subtitle?: string | null): void {
  const { setHeader } = usePageHeaderContext();
  useEffect(() => {
    setHeader({ title, subtitle: subtitle ?? null });
    return () => setHeader({ title: null, subtitle: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle]);
}
