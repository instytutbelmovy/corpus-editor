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
    const currentRef = observerRef.current;
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

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loadingMore, loading, lastParagraphId, onLoadMore]);

  return observerRef;
}
