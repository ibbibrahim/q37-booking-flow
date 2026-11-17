import { useInfiniteQuery } from '@tanstack/react-query';

interface UseBoardColumnOptions<T> {
  queryKey: readonly unknown[];
  fetchPage: (page: number, pageSize: number) => Promise<{ items: T[]; total: number }>;
  pageSize?: number;
  enabled?: boolean;
}

/** Loads one board column page-by-page ("Load more"), exposing the server-reported total. */
export function useBoardColumn<T>({ queryKey, fetchPage, pageSize = 20, enabled = true }: UseBoardColumnOptions<T>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      return loaded < lastPage.total && lastPage.items.length > 0 ? lastPageParam + 1 : undefined;
    },
    enabled,
    staleTime: 30_000,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[query.data.pages.length - 1]?.total;

  return {
    items,
    total,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    loadMore: () => {
      void query.fetchNextPage();
    },
  };
}
