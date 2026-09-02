import { useDocumentStore } from '@/app/docs/store';
import { DocumentData, DocumentHeader } from '@/app/docs/types';

// Тэставы дакумэнт нясе лічыльнік `version`, які мок StructureEditor павялічвае
// на кожнае рэдагаваньне — так відаць, які здымак гісторыі актыўны.
type VersionedData = DocumentData & { version: number };

jest.mock('@/app/docs/structureEditor', () => ({
  StructureEditor: {
    addWord: jest.fn((data: VersionedData) => ({
      ...data,
      version: data.version + 1,
    })),
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

  it('кладзе ў гісторыю спасылку і не дублюе нязьменны стан', () => {
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

    store.snapshot();
    expect(useDocumentStore.getState().history).toHaveLength(1);
    // Здымак — гэта тая самая спасылка, а не копія
    expect(useDocumentStore.getState().history[0]).toBe(initialData);
    // documentData здымак не падмяняе
    expect(useDocumentStore.getState().documentData).toBe(initialData);

    // Паўторны здымак без зьменаў нічога не дадае
    store.snapshot();
    store.snapshot();
    expect(useDocumentStore.getState().history).toHaveLength(1);

    // Пасьля рэальнай зьмены дакумэнта здымак зноў дадаецца
    const edited: VersionedData = { ...initialData, version: 1 };
    useDocumentStore.setState({ documentData: edited });
    store.snapshot();
    expect(useDocumentStore.getState().history).toHaveLength(2);
  });

  it('не дадае здымак адразу пасьля undo', () => {
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

    const historyLength = useDocumentStore.getState().history.length;
    store.snapshot();
    expect(useDocumentStore.getState().history).toHaveLength(historyLength);
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
