import { useEffect, useRef } from 'react';
import { useDocumentStore } from '../store';

interface UseInfiniteScrollProps {
  onLoadMore: (skipUpToId: number) => void;
}

export function useInfiniteScroll({ onLoadMore }: UseInfiniteScrollProps) {
  const { hasMore, loadingMore, loading, lastParagraphId } = useDocumentStore();
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
