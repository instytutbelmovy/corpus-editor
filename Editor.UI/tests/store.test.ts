import { useDocumentStore } from '@/app/docs/store';
import { DocumentData, DocumentHeader } from '@/app/docs/types';
import { StructureEditor } from '@/app/docs/structureEditor';

// Тэставы дакумэнт нясе лічыльнік `version`, які мок StructureEditor павялічвае
// на кожнае рэдагаваньне - так відаць, які здымак гісторыі актыўны.
type VersionedData = DocumentData & { version: number };

jest.mock('@/app/docs/structureEditor', () => ({
  StructureEditor: {
    addWord: jest.fn((data: VersionedData) => ({
      ...data,
      version: data.version + 1,
    })),
    joinParagraph: jest.fn((data: DocumentData) => data),
  },
}));

const currentVersion = () =>
  (useDocumentStore.getState().documentData as VersionedData | null)?.version;

describe('DocumentStore Undo/Redo', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      documentData: null,
      originalDocumentData: null,
      history: [],
      historyIndex: -1,
    });
  });

  it('should undo and redo correctly', () => {
    const initialData: VersionedData = {
      header: { n: 1 } as DocumentHeader,
      paragraphs: [],
      version: 0,
    };

    useDocumentStore.setState({
      documentData: initialData,
      originalDocumentData: structuredClone(initialData),
    });

    const store = useDocumentStore.getState();

    store.addWord(1, 1, 0);
    expect(currentVersion()).toBe(1);
    expect(useDocumentStore.getState().historyIndex).toBe(0);

    store.addWord(1, 1, 0);
    expect(currentVersion()).toBe(2);
    expect(useDocumentStore.getState().historyIndex).toBe(1);

    store.undo();
    expect(currentVersion()).toBe(1);
    expect(useDocumentStore.getState().historyIndex).toBe(0);

    // Ніжэй першага здымка вяртаемся да зыходнага стану
    store.undo();
    expect(currentVersion()).toBe(0);
    expect(useDocumentStore.getState().historyIndex).toBe(-1);

    store.redo();
    expect(currentVersion()).toBe(1);
    expect(useDocumentStore.getState().historyIndex).toBe(0);

    store.redo();
    expect(currentVersion()).toBe(2);
    expect(useDocumentStore.getState().historyIndex).toBe(1);
  });

  it('не дадае здымак, калі StructureEditor вяртае той самы аб’ект (no-op)', () => {
    const initialData: VersionedData = {
      header: { n: 1 } as DocumentHeader,
      paragraphs: [],
      version: 0,
    };

    useDocumentStore.setState({
      documentData: initialData,
      originalDocumentData: structuredClone(initialData),
    });

    const store = useDocumentStore.getState();
    store.addWord(1, 1, 0);
    const { history: historyBefore, historyIndex: indexBefore } =
      useDocumentStore.getState();

    store.joinParagraph(1);
    expect(StructureEditor.joinParagraph).toHaveBeenCalled();

    expect(useDocumentStore.getState().history).toHaveLength(
      historyBefore.length
    );
    expect(useDocumentStore.getState().historyIndex).toBe(indexBefore);
  });

  it('should drop the redo tail after a new edit', () => {
    const initialData: VersionedData = {
      header: { n: 1 } as DocumentHeader,
      paragraphs: [],
      version: 0,
    };

    useDocumentStore.setState({
      documentData: initialData,
      originalDocumentData: structuredClone(initialData),
    });

    const store = useDocumentStore.getState();
    store.addWord(1, 1, 0);
    store.addWord(1, 1, 0);
    store.undo();
    store.addWord(1, 1, 0);

    expect(useDocumentStore.getState().history).toHaveLength(2);
    expect(useDocumentStore.getState().historyIndex).toBe(1);
    expect(currentVersion()).toBe(2);
  });
});
