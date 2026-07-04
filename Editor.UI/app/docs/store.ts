import { create } from 'zustand';
import { DocumentData, DocumentHeader, ParagraphOperation, OperationType, Sentence, SentenceItem } from './types';
import { DocumentService } from './service';
import { StructureEditor, EditResult } from './structureEditor';
import { useUIStore } from './uiStore';

interface DocumentState {
  // Данныя дакумэнта
  documentData: DocumentData | null;
  originalDocumentData: DocumentData | null;
  documentsList: DocumentHeader[];

  // Гісторыя
  history: { documentData: DocumentData }[];
  historyIndex: number;

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
  updateItemText: (paragraphId: number, sentenceId: number, itemIndex: number, text: string, replaceHistory?: boolean) => void;

  _applyEdit: (editResult: EditResult, replaceHistory?: boolean) => void;
  snapshot: (replace?: boolean) => void;
  startEditing: () => void;

  // Helpers
  hasChanges: () => boolean;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  // Пачатковы стан
  documentData: null,
  originalDocumentData: null,
  documentsList: [],
  history: [],
  historyIndex: -1,
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

  undo: () => {
    const { history, historyIndex, originalDocumentData } = get();

    if (historyIndex > 0) {
      // Restore the previous state from history
      const prev = history[historyIndex - 1];
      set({
        documentData: prev.documentData,
        historyIndex: historyIndex - 1,
      });
    } else if (historyIndex === 0) {
      // Restore the original state
      if (originalDocumentData) {
        set({
          documentData: JSON.parse(JSON.stringify(originalDocumentData)),
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
        history: [],
        historyIndex: -1,
      });
    }
  },

  saveEditing: async () => {
    const { documentService, documentData, originalDocumentData } = get();
    if (!documentService || !documentData || !originalDocumentData) return;

    const operations = calculateOperations(originalDocumentData, documentData);
    if (operations.length === 0) return;

    try {
      set({ loading: true });

      const response = await documentService.saveDocument(documentData.header.n, operations);

      // Merge edited paragraphs into current data
      const newParagraphs = [...documentData.paragraphs];

      for (const editedP of response.editedParagraphs) {
        const index = newParagraphs.findIndex(p => p.id === editedP.id);
        if (index !== -1) {
          newParagraphs[index] = editedP;
        } else {
          console.error(`Received update for unknown paragraph ID: ${editedP.id}`);
        }
      }

      const newDocumentData = {
        ...documentData,
        paragraphs: newParagraphs
      };

      set({
        documentData: newDocumentData,
        originalDocumentData: JSON.parse(JSON.stringify(newDocumentData)), // New baseline
        history: [],
        historyIndex: -1,
        loading: false
      });

    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Save failed', loading: false });
    }
  },

  // Helper for applying edits
  _applyEdit: (editResult: EditResult, replaceHistory = false) => {
    const { newDocumentData } = editResult;
    const { history, historyIndex } = get();

    // Slice history if we are in the middle
    const newHistory = history.slice(0, historyIndex + 1);

    if (replaceHistory && historyIndex >= 0) {
      // Replace the current history entry
      newHistory[historyIndex] = {
        documentData: newDocumentData,
      };

      set({
        documentData: newDocumentData,
        history: newHistory,
        // historyIndex stays same
      });
    } else {
      // Push new state
      newHistory.push({
        documentData: newDocumentData,
      });

      set({
        documentData: newDocumentData,
        history: newHistory,
        historyIndex: newHistory.length - 1
      });
    }
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

  updateItemText: (pId: number, sId: number, itemIdx: number, text: string, replaceHistory = false) => {
    const { documentData } = get();
    if (!documentData) return;
    const result = StructureEditor.updateItemText(documentData, pId, sId, itemIdx, text);
    get()._applyEdit(result, replaceHistory);
  },

  snapshot: (replace = false) => {
    const { history, historyIndex, documentData } = get();
    if (!documentData) return;

    // Slice history if we are in the middle
    const newHistory = history.slice(0, historyIndex + 1);

    const newState = {
      documentData: JSON.parse(JSON.stringify(documentData)),
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
      });
    }
  },

  hasChanges: () => {
    const { documentData, originalDocumentData } = get();
    if (!documentData || !originalDocumentData) return false;
    const ops = calculateOperations(originalDocumentData, documentData);
    return ops.length > 0;
  }
}));

function calculateOperations(original: DocumentData, current: DocumentData): ParagraphOperation[] {
  const operations: ParagraphOperation[] = [];

  // Map original paragraphs by concurrencyStamp for quick lookup
  const originalMap = new Map<string, number>();
  original.paragraphs.forEach((p, index) => originalMap.set(p.concurrencyStamp, index));

  let virtualIndex = 0; // The index in 'original' we are currently matching against

  for (let i = 0; i < current.paragraphs.length; i++) {
    const currentP = current.paragraphs[i];
    const origIdx = originalMap.get(currentP.concurrencyStamp);

    // Check if we found a matching paragraph in the remaining original paragraphs
    if (origIdx !== undefined && origIdx >= virtualIndex) {
      // We found a match (or a move forward).
      // Any paragraphs between virtualIndex and origIdx were skipped/deleted.

      // Generate Deletes for skipped paragraphs
      for (let k = virtualIndex; k < origIdx; k++) {
        const pToDelete = original.paragraphs[k];
        operations.push({
          paragraphId: i + 1, // The deletion happens at the current build position
          operationType: OperationType.Delete,
          replacementSentences: null,
          concurrencyStamp: pToDelete.concurrencyStamp
        });
      }

      // Now we process the matched paragraph
      const originalP = original.paragraphs[origIdx];
      const originalContent = JSON.stringify(originalP.sentences.map((s: Sentence) => s.sentenceItems.map((si: SentenceItem) => si.linguisticItem)));
      const currentContent = JSON.stringify(currentP.sentences.map((s: Sentence) => s.sentenceItems.map((si: SentenceItem) => si.linguisticItem)));

      if (originalContent !== currentContent) {
        operations.push({
          paragraphId: i + 1,
          operationType: OperationType.Update,
          replacementSentences: currentP.sentences.map((s: Sentence) => s.sentenceItems.map((si: SentenceItem) => si.linguisticItem)),
          concurrencyStamp: originalP.concurrencyStamp
        });
      }

      // Advance virtualIndex past the matched paragraph
      virtualIndex = origIdx + 1;

    } else {
      // Not found in remaining originals -> Treat as Create
      operations.push({
        paragraphId: i + 1,
        operationType: OperationType.Create,
        replacementSentences: currentP.sentences.map((s: Sentence) => s.sentenceItems.map((si: SentenceItem) => si.linguisticItem)),
        concurrencyStamp: null
      });
    }
  }

  // Handle trailing deletes (any original paragraphs not reached)
  for (let k = virtualIndex; k < original.paragraphs.length; k++) {
    const pToDelete = original.paragraphs[k];
    operations.push({
      paragraphId: current.paragraphs.length + 1, // Deleting from the end
      operationType: OperationType.Delete,
      replacementSentences: null,
      concurrencyStamp: pToDelete.concurrencyStamp
    });
  }

  return operations;
}
