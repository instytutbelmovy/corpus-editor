import { useEffect, useRef } from 'react';
import { useDocumentStore } from '../store';

interface UseInfiniteScrollProps {
  onLoadMore: (skipUpToId: number) => void;
}

export function useInfiniteScroll({ onLoadMore }: UseInfiniteScrollProps) {
  const hasMore = useDocumentStore(state => state.hasMore);
  const loadingMore = useDocumentStore(state => state.loadingMore);
  const loading = useDocumentStore(state => state.loading);
  const lastParagraphId = useDocumentStore(state => state.lastParagraphId);
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
