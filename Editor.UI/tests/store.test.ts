import { useDocumentStore } from '../app/docs/store';
import { DocumentData, OperationType } from '../app/docs/types';

// Mock StructureEditor
jest.mock('../app/docs/structureEditor', () => ({
  StructureEditor: {
    addWord: jest.fn((data) => ({
      newDocumentData: { ...data, version: (data.version || 0) + 1 },
      newOperations: [],
    })),
  },
}));

describe('DocumentStore Undo/Redo', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      documentData: null,
      originalDocumentData: null,
      history: [],
      historyIndex: -1,
      pendingOperations: [],
    });
  });

  it('should undo and redo correctly', () => {
    const initialData: any = { header: { n: 1 }, paragraphs: [], version: 0 };

    // Initialize store
    useDocumentStore.setState({
      documentData: initialData,
      originalDocumentData: JSON.parse(JSON.stringify(initialData)),
    });

    const store = useDocumentStore.getState();

    // Action 1
    store.addWord(1, 1, 0);
    let state = useDocumentStore.getState();
    expect(state.documentData?.version).toBe(1);
    expect(state.historyIndex).toBe(0);

    // Action 2
    store.addWord(1, 1, 0);
    state = useDocumentStore.getState();
    expect(state.documentData?.version).toBe(2);
    expect(state.historyIndex).toBe(1);

    // Undo 1 (Should go to version 1)
    state.undo();
    state = useDocumentStore.getState();
    expect(state.documentData?.version).toBe(1);
    expect(state.historyIndex).toBe(0);

    // Undo 2 (Should go to version 0 - original)
    state.undo();
    state = useDocumentStore.getState();
    expect(state.documentData?.version).toBe(0);
    expect(state.historyIndex).toBe(-1);

    // Redo 1 (Should go to version 1)
    state.redo();
    state = useDocumentStore.getState();
    expect(state.documentData?.version).toBe(1);
    expect(state.historyIndex).toBe(0);

    // Redo 2 (Should go to version 2)
    state.redo();
    state = useDocumentStore.getState();
    expect(state.documentData?.version).toBe(2);
    expect(state.historyIndex).toBe(1);
  });
});
