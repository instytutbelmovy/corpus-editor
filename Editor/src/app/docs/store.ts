import { create } from 'zustand';
import { DocumentData, DocumentHeader } from './types';
import { DocumentService } from './service';

interface DocumentState {
  // Данныя дакумэнта
  documentData: DocumentData | null;
  documentsList: DocumentHeader[];

  // Стан загрузкі
  loading: boolean;
  loadingMore: boolean;
  error: string | null;

  // Пагінацыя
  hasMore: boolean;
  lastParagraphId: number;

  // Сэрвіс
  documentService: DocumentService | null;

  // Дзеяньні
  setDocumentService: (service: DocumentService) => void;
  fetchDocument: (documentId: string, skipUpToId?: number, isInitial?: boolean) => Promise<void>;
  reloadDocument: (documentId: string) => Promise<void>;
  fetchDocuments: () => Promise<void>;
  refreshDocumentHeader: (documentId: number) => Promise<void>;
  refreshDocumentsList: () => Promise<void>;
  updateDocument: (updater: (prev: DocumentData | null) => DocumentData | null) => void;
  clearDocument: () => void;
  setError: (error: string | null) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  // Пачатковы стан
  documentData: null,
  documentsList: [],
  loading: false,
  loadingMore: false,
  error: null,
  hasMore: true,
  lastParagraphId: 0,
  documentService: null,

  // Дзеяньні
  setDocumentService: (service) => set({ documentService: service }),

  fetchDocument: async (documentId, skipUpToId = 0, isInitial = false) => {
    const { documentService } = get();
    if (!documentService) {
      set({ error: 'Сэрвіс не ініцыялізаваны', loading: false, loadingMore: false });
      return;
    }

    try {
      if (isInitial) {
        set({ loading: true, error: null });
      } else {
        set({ loadingMore: true, error: null });
      }

      const data = await documentService.fetchDocument(documentId, skipUpToId);

      if (isInitial) {
        set({
          documentData: data,
          lastParagraphId: data.paragraphs.length > 0
            ? data.paragraphs[data.paragraphs.length - 1].id
            : 0,
          hasMore: data.paragraphs.length === 20,
          loading: false,
        });
      } else {
        set(state => ({
          documentData: state.documentData ? {
            ...state.documentData,
            paragraphs: [...state.documentData.paragraphs, ...data.paragraphs],
          } : data,
          lastParagraphId: data.paragraphs.length > 0
            ? data.paragraphs[data.paragraphs.length - 1].id
            : 0,
          hasMore: data.paragraphs.length === 20,
          loadingMore: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Невядомая памылка';
      set({
        error: errorMessage,
        loading: false,
        loadingMore: false
      });
    }
  },

  reloadDocument: async (documentId) => {
    const { documentService, documentData, lastParagraphId } = get();
    if (!documentService || !documentData || lastParagraphId === 0) {
      return;
    }

    // Знаходзім максімальны ID параграфа
    const maxParagraphId = Math.max(
      ...documentData.paragraphs.map(p => p.id),
      lastParagraphId
    );

    const data = await documentService.fetchDocument(documentId, 0, maxParagraphId);

    const reloadedParagraphs = data.paragraphs

    set(state => ({
      documentData: state.documentData ? {
        ...state.documentData,
        header: state.documentData.header,
        paragraphs: reloadedParagraphs,
      } : null,
    }));
  },

  fetchDocuments: async () => {
    const { documentService } = get();
    if (!documentService) {
      set({ error: 'Сэрвіс не ініцыялізаваны' });
      return;
    }

    try {
      set({ loading: true, error: null });
      const documents = await documentService.fetchDocuments();
      set({ documentsList: documents, loading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Невядомая памылка';
      set({ error: errorMessage, loading: false });
    }
  },

  refreshDocumentHeader: async (documentId: number) => {
    const { documentService } = get();
    if (!documentService) {
      return;
    }

    try {
      const updatedHeader = await documentService.refreshDocument(documentId);
      set(state => ({
        documentsList: state.documentsList.map(doc =>
          doc.n === documentId ? updatedHeader : doc
        )
      }));
    } catch (err) {
      console.error('Failed to refresh document:', err);
      // Optionally handle error in UI
    }
  },

  refreshDocumentsList: async () => {
    const { documentService } = get();
    if (!documentService) {
      return;
    }

    try {
      set({ loading: true, error: null });
      const documents = await documentService.refreshDocumentsList();
      set({ documentsList: documents, loading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Невядомая памылка';
      set({ error: errorMessage, loading: false });
    }
  },

  updateDocument: (updater) => {
    set(state => ({
      documentData: updater(state.documentData)
    }));
  },

  clearDocument: () => {
    set({
      documentData: null,
      error: null,
      hasMore: true,
      lastParagraphId: 0,
    });
  },

  setError: (error) => set({ error }),
}));
