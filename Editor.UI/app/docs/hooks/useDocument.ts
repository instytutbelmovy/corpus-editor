import { useEffect } from 'react';
import { useDocumentStore } from '../store';

export function useDocument(documentId: string) {
  const { 
    documentData, 
    loading, 
    error, 
    loadingMore, 
    hasMore, 
    lastParagraphId,
    fetchDocument, 
    updateDocument 
  } = useDocumentStore();

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
    lastParagraphId,
    fetchDocument,
    updateDocument,
  };
}
