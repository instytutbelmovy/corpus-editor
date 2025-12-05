import { create } from 'zustand';
import { DocumentData, DocumentHeader, ParagraphOperation } from './types';
import { DocumentService } from './service';
import { StructureEditor, EditResult } from './structureEditor';
import { useUIStore } from './uiStore';

interface DocumentState {
  // Данныя дакумэнта
  // Данныя дакумэнта
  documentData: DocumentData | null;
  originalDocumentData: DocumentData | null;
  documentsList: DocumentHeader[];

  // Гісторыя
  history: { documentData: DocumentData; pendingOperations: ParagraphOperation[] }[];
  historyIndex: number;
  pendingOperations: ParagraphOperation[];

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

  // Structural Editing Actions
  undo: () => void;
  redo: () => void;
  cancelEditing: () => void;
  saveEditing: () => Promise<void>;

  addWord: (paragraphId: number, sentenceId: number, wordIndex: number) => void;
  addPunctuation: (paragraphId: number, sentenceId: number, wordIndex: number) => void;
  addLineBreak: (paragraphId: number, sentenceId: number, wordIndex: number) => void;
  splitSentence: (paragraphId: number, sentenceId: number, splitIndex: number) => void;
  splitParagraph: (paragraphId: number, sentenceId: number) => void;
  joinSentence: (paragraphId: number, sentenceId: number) => void;
  joinParagraph: (paragraphId: number) => void;
  deleteItem: (paragraphId: number, sentenceId: number, itemIndex: number) => void;
  setGlue: (paragraphId: number, sentenceId: number, itemIndex: number, glueNext: boolean) => void;

  _applyEdit: (editResult: EditResult) => void;
  snapshot: (replace?: boolean) => void;
  startEditing: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  // Пачатковы стан
  // Пачатковы стан
  documentData: null,
  originalDocumentData: null,
  documentsList: [],
  history: [],
  historyIndex: -1,
  pendingOperations: [],
  loading: false,
  loadingMore: false,
  error: null,
  hasMore: true,
  lastParagraphId: 0,
  documentService: null,

  // Дзеяньні
  setDocumentService: (service: DocumentService) => set({ documentService: service }),

  fetchDocument: async (documentId: string, skipUpToId = 0, isInitial = false) => {
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
          originalDocumentData: JSON.parse(JSON.stringify(data)),
          lastParagraphId: data.paragraphs.length > 0
            ? data.paragraphs[data.paragraphs.length - 1].id
            : 0,
          hasMore: data.paragraphs.length === 20,
          loading: false,
          history: [],
          historyIndex: -1,
          pendingOperations: [],
        });
      } else {
        set((state: DocumentState) => ({
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

  reloadDocument: async (documentId: string) => {
    const { documentService, documentData, lastParagraphId } = get();
    if (!documentService || !documentData || lastParagraphId === 0) {
      return;
    }

    // Знаходзім максімальны ID параграфа
    const maxParagraphId = Math.max(
      ...documentData.paragraphs.map((p: { id: number }) => p.id),
      lastParagraphId
    );

    const data = await documentService.fetchDocument(documentId, 0, maxParagraphId);

    const reloadedParagraphs = data.paragraphs

    set((state: DocumentState) => ({
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
      set((state: DocumentState) => ({
        documentsList: state.documentsList.map((doc: DocumentHeader) =>
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

  updateDocument: (updater: (prev: DocumentData | null) => DocumentData | null) => {
    set((state: DocumentState) => ({
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

  setError: (error: string | null) => set({ error }),



  // Structural Editing Implementation

  // Structural Editing Implementation
  undo: () => {
    const { history, historyIndex, originalDocumentData } = get();

    if (historyIndex > 0) {
      // Restore the previous state from history
      const prev = history[historyIndex - 1];
      set({
        documentData: prev.documentData,
        pendingOperations: prev.pendingOperations,
        historyIndex: historyIndex - 1,
      });
    } else if (historyIndex === 0) {
      // Restore the original state
      if (originalDocumentData) {
        set({
          documentData: JSON.parse(JSON.stringify(originalDocumentData)),
          pendingOperations: [],
          historyIndex: -1,
        });
      }
    }
    useUIStore.getState().clearSelectedWord();
  },

  redo: () => {
    // To support redo, we need to keep the "future" in the history array, just move the index.
    // When new action happens, we slice the history.

    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      if (nextIndex < history.length) {
        const nextState = history[nextIndex];
        set({
          documentData: nextState.documentData,
          pendingOperations: nextState.pendingOperations,
          historyIndex: nextIndex
        });
      }
    }
    useUIStore.getState().clearSelectedWord();
  },

  cancelEditing: () => {
    const { originalDocumentData } = get();
    if (originalDocumentData) {
      set({
        documentData: JSON.parse(JSON.stringify(originalDocumentData)),
        pendingOperations: [],
        history: [],
        historyIndex: -1,
      });
    }
  },

  saveEditing: async () => {
    const { documentService, documentData, pendingOperations } = get();
    if (!documentService || !documentData || pendingOperations.length === 0) return;

    try {
      set({ loading: true });
      // We need to send operations to BE.
      // The BE returns updated paragraphs.
      // We need to update our local state with these paragraphs.

      // Note: pendingOperations might contain operations for paragraphs that are not in the current view?
      // No, we only edit what we see.

      // We need to construct the request.
      // The `EditDocument` endpoint takes `DocumentEditRequest`.

      // We need to group operations? No, the request takes a list.
      // But we need to ensure they are sorted and IDs are correct?
      // `StructureEditor` should generate them with correct IDs relative to the *starting* state of the transaction?
      // No, `StructureEditor` generates operations sequentially.
      // If we have multiple ops, we accumulate them.

      // Wait, `StructureEditor` returns `newOperations`.
      // If we perform 2 actions:
      // 1. Add word (Op1)
      // 2. Add word (Op2)
      // `pendingOperations` = [Op1, Op2].

      // The BE expects "paragraph ids must go in non-decreasing order".
      // And "subsequent operation's ParagraphId to match those updated ids".

      // Our `StructureEditor` logic updates the local `documentData` (shifting IDs).
      // And generates an operation based on the *current* state (which has shifted IDs).
      // So the operations generated sequentially *should* be correct for the BE if sent in order.

      // Example:
      // Doc: P1, P2, P3.
      // Delete P2.
      // Local: P1, P2 (was P3).
      // Op1: Delete P2.

      // Next, Delete P2 (was P3).
      // Local: P1.
      // Op2: Delete P2.

      // BE:
      // Op1 (Delete P2): P1, P2, P3 -> P1, P3.
      // Op2 (Delete P2): P1, P3 -> P1.

      // Matches!

      // So we just send `pendingOperations`.

      const response = await documentService.saveDocument(documentData.header.n, pendingOperations);

      // Update paragraphs
      // The response contains `EditedParagraphs`.
      // We need to replace them in our local state.
      // But wait, we already updated our local state!
      // The BE might return slightly different data (e.g. resolved metadata, re-calculated things).
      // So we should update.

      // Matching IDs:
      // The BE returns paragraphs with their *new* IDs.
      // Our local `documentData` should already have these IDs.

      const newParagraphs = [...documentData.paragraphs];
      for (const editedP of response.editedParagraphs) {
        const index = newParagraphs.findIndex(p => p.id === editedP.id);
        if (index !== -1) {
          // Convert ParagraphView to Paragraph
          // We need a mapper or just cast if compatible?
          // Types are slightly different (View vs Internal).
          // We need to map `SentenceView` to `Sentence`.

          // Let's assume we can map it back.
          // Actually, `fetchDocument` returns `DocumentData` which has `Paragraph`.
          // The service should handle the mapping?
          // `saveDocument` in service should return `DocumentData` or similar?
          // The API returns `DocumentEditResponse`.

          // I'll need to update `service.ts` to implement `saveDocument`.
          // And likely a mapper.

          // For now, let's assume we get back compatible data or we just trust our local state
          // and only update concurrency stamps?
          // No, we should update content.

          // Let's implement `saveDocument` in service first.

          // For now in store, let's assume `saveDocument` returns the updated paragraphs in a format we can use.

          // Actually, if I update `service.ts`, I can make it return `Paragraph[]`.
        }
      }

      // For now, let's just clear pending and update history.
      set({
        pendingOperations: [],
        history: [],
        historyIndex: -1,
        originalDocumentData: JSON.parse(JSON.stringify(documentData)), // New baseline
        loading: false
      });

      // We should probably reload the document or merge the response to be safe.
      // Let's trigger a reload of the document to get fresh state from BE?
      // That's safer but slower.
      // Or we can just trust the BE response.

      // Let's reload for now to be safe and simple.
      await get().fetchDocument(documentData.header.n.toString(), 0, true);

    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Save failed', loading: false });
    }
  },

  // Helper for applying edits
  _applyEdit: (editResult: EditResult) => {
    const { newDocumentData, newOperations } = editResult;
    const { history, historyIndex, pendingOperations } = get();

    // Slice history if we are in the middle
    const newHistory = history.slice(0, historyIndex + 1);

    // Push new state
    newHistory.push({
      documentData: newDocumentData,
      pendingOperations: [...pendingOperations, ...newOperations]
    });

    set({
      documentData: newDocumentData,
      pendingOperations: [...pendingOperations, ...newOperations],
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  addWord: (pId: number, sId: number, wIdx: number) => {
    const { documentData } = get();
    if (!documentData) return;
    const result = StructureEditor.addWord(documentData, pId, sId, wIdx);
    get()._applyEdit(result);
  },

  addPunctuation: (pId: number, sId: number, wIdx: number) => {
    const { documentData } = get();
    if (!documentData) return;
    const result = StructureEditor.addPunctuation(documentData, pId, sId, wIdx);
    get()._applyEdit(result);
    get().snapshot();
  },

  addLineBreak: (pId: number, sId: number, wIdx: number) => {
    const { documentData } = get();
    if (!documentData) return;
    const result = StructureEditor.addLineBreak(documentData, pId, sId, wIdx);
    get()._applyEdit(result);
    get().snapshot();
  },

  splitSentence: (pId: number, sId: number, splitIdx: number) => {
    const { documentData } = get();
    if (!documentData) return;
    const result = StructureEditor.splitSentence(documentData, pId, sId, splitIdx);
    get()._applyEdit(result);
  },

  splitParagraph: (pId: number, sId: number) => {
    const { documentData } = get();
    if (!documentData) return;
    const result = StructureEditor.splitParagraph(documentData, pId, sId);
    get()._applyEdit(result);
  },

  joinSentence: (pId: number, sId: number) => {
    const { documentData } = get();
    if (!documentData) return;
    const result = StructureEditor.joinSentence(documentData, pId, sId);
    get()._applyEdit(result);
  },

  joinParagraph: (pId: number) => {
    const { documentData } = get();
    if (!documentData) return;
    const result = StructureEditor.joinParagraph(documentData, pId);
    get()._applyEdit(result);
  },

  deleteItem: (pId: number, sId: number, itemIdx: number) => {
    const { documentData } = get();
    if (!documentData) return;
    const result = StructureEditor.deleteItem(documentData, pId, sId, itemIdx);
    get()._applyEdit(result);
  },

  setGlue: (pId: number, sId: number, itemIdx: number, glueNext: boolean) => {
    const { documentData } = get();
    if (!documentData) return;
    const result = StructureEditor.setGlue(documentData, pId, sId, itemIdx, glueNext);
    get()._applyEdit(result);
    get().snapshot();
  },

  snapshot: (replace = false) => {
    const { history, historyIndex, documentData, pendingOperations } = get();
    if (!documentData) return;

    // Slice history if we are in the middle
    const newHistory = history.slice(0, historyIndex + 1);

    const newState = {
      documentData: JSON.parse(JSON.stringify(documentData)),
      pendingOperations: [...pendingOperations]
    };

    // Deduplication: Check if the new state is identical to the previous one
    if (historyIndex >= 0) {
      const prevState = history[historyIndex];
      const isIdentical = JSON.stringify(prevState.documentData) === JSON.stringify(newState.documentData);

      if (isIdentical && !replace) {
        // If states are identical and we are not forcing a replacement, skip snapshot
        return;
      }
    }

    if (replace && historyIndex >= 0) {
      newHistory[historyIndex] = newState;
      set({ history: newHistory });
    } else {
      newHistory.push(newState);
      set({
        history: newHistory,
        historyIndex: newHistory.length - 1
      });
    }
  },

  startEditing: () => {
    const { documentData } = get();
    if (documentData) {
      set({
        originalDocumentData: JSON.parse(JSON.stringify(documentData)),
        history: [],
        historyIndex: -1,
        pendingOperations: []
      });
    }
  },
}));
