import { useEffect, useRef } from 'react';

interface UseInfiniteScrollProps {
  hasMore: boolean;
  loadingMore: boolean;
  loading: boolean;
  lastParagraphId: number;
  onLoadMore: (skipUpToId: number) => void;
}

export function useInfiniteScroll({
  hasMore,
  loadingMore,
  loading,
  lastParagraphId,
  onLoadMore,
}: UseInfiniteScrollProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          onLoadMore(lastParagraphId);
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [hasMore, loadingMore, loading, lastParagraphId, onLoadMore]);

  return observerRef;
}
