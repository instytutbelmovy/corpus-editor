import { useEffect } from 'react';
import { useDocumentStore } from '../store';

export function useDocument(documentId: string) {
  const documentData = useDocumentStore(state => state.documentData);
  const loading = useDocumentStore(state => state.loading);
  const error = useDocumentStore(state => state.error);
  const loadingMore = useDocumentStore(state => state.loadingMore);
  const hasMore = useDocumentStore(state => state.hasMore);
  const actionError = useDocumentStore(state => state.actionError);
  const clearActionError = useDocumentStore(state => state.clearActionError);
  const fetchDocument = useDocumentStore(state => state.fetchDocument);

  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId, 0, true);
    }
  }, [documentId, fetchDocument]);

  return {
    documentData,
    loading,
    error,
    loadingMore,
    hasMore,
    actionError,
    clearActionError,
    fetchDocument,
  };
}
