import { create } from 'zustand';
import { DocumentData, DocumentHeader } from './types';
import { DocumentService } from './service';

interface DocumentState {
  // Данныя дакумента
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
  
  // Дзеянні
  setDocumentService: (service: DocumentService) => void;
  fetchDocument: (documentId: string, skipUpToId?: number, isInitial?: boolean) => Promise<void>;
  fetchDocuments: () => Promise<void>;
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

  // Дзеянні
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
