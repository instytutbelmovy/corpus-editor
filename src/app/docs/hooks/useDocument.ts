import { useState, useCallback, useEffect } from 'react';
import { DocumentData } from '@/types/document';
import { useAuth } from '../../../pages/_app';

export function useDocument(documentId: string) {
  const { documentService } = useAuth();
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastParagraphId, setLastParagraphId] = useState(0);

  const fetchDocument = useCallback(
    async (skipUpToId: number = 0, isInitial: boolean = false) => {
      if (!documentService) {
        setError('Сэрвіс не ініцыялізаваны');
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      try {
        if (isInitial) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const data = await documentService.fetchDocument(
          documentId,
          skipUpToId
        );

        if (isInitial) {
          setDocumentData(data);
          setLastParagraphId(
            data.paragraphs.length > 0
              ? data.paragraphs[data.paragraphs.length - 1].id
              : 0
          );
        } else {
          setDocumentData(prev => {
            if (!prev) return data;
            return {
              ...prev,
              paragraphs: [...prev.paragraphs, ...data.paragraphs],
            };
          });
          setLastParagraphId(
            data.paragraphs.length > 0
              ? data.paragraphs[data.paragraphs.length - 1].id
              : 0
          );
        }

        setHasMore(data.paragraphs.length === 20);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Невядомая памылка');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [documentId, documentService]
  );

  useEffect(() => {
    if (documentId) {
      fetchDocument(0, true);
    }
  }, [documentId, fetchDocument]);

  const updateDocument = useCallback(
    (updater: (prev: DocumentData) => DocumentData) => {
      setDocumentData(prev => {
        if (!prev) return prev;
        return updater(prev);
      });
    },
    []
  );

  return {
    documentData,
    loading,
    error,
    loadingMore,
    hasMore,
    lastParagraphId,
    fetchDocument,
    updateDocument,
  };
}
