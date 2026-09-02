import { useDocumentStore } from '@/app/docs/store';
import {
  DocumentData,
  DocumentHeader,
  OperationType,
  Paragraph,
  ParagraphOperation,
  SentenceItemType,
} from '@/app/docs/types';
import { serviceLocator } from '@/app/services/serviceLocator';

jest.mock('@/app/services/serviceLocator', () => ({
  serviceLocator: {
    documentService: {
      fetchDocument: jest.fn(),
      saveDocument: jest.fn(),
    },
  },
}));

const documentService = serviceLocator.documentService as jest.Mocked<
  typeof serviceLocator.documentService
>;

// Абзац з адным сказам і адным словам; id = і нумар абзаца, і аснова stamp'а
const paragraphOf = (id: number, text: string): Paragraph => ({
  id,
  concurrencyStamp: `p${id}`,
  sentences: [
    {
      id,
      concurrencyStamp: `s${id}`,
      sentenceItems: [
        {
          linguisticItem: {
            text,
            type: SentenceItemType.Word,
            lemma: null,
            linguisticTag: null,
            paradigmFormId: null,
            comment: '',
            metadata: null,
            glueNext: false,
          },
          options: [],
        },
      ],
    },
  ],
});

const pageOf = (ids: number[]): DocumentData => ({
  header: { n: 1 } as DocumentHeader,
  paragraphs: ids.map(id => paragraphOf(id, `слова${id}`)),
});

// Апэрацыі, якія пайшлі б на бэкенд пры захаваньні бягучага стану
async function operationsOnSave(): Promise<ParagraphOperation[]> {
  documentService.saveDocument.mockResolvedValue({ editedParagraphs: [] });
  await useDocumentStore.getState().saveEditing();

  const call = documentService.saveDocument.mock.calls.at(-1);
  return call ? call[1] : [];
}

describe('пагінацыя падчас рэдагаваньня структуры', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDocumentStore.setState({
      documentData: null,
      originalDocumentData: null,
      history: [],
      historyIndex: -1,
      loading: false,
      loadingMore: false,
      error: null,
      saving: false,
      actionError: null,
      hasMore: true,
      lastParagraphId: 0,
    });
  });

  // Загружае першую старонку (абзацы 1-2) і ўваходзіць у рэжым структуры
  const loadFirstPage = async () => {
    documentService.fetchDocument.mockResolvedValue(pageOf([1, 2]));
    await useDocumentStore.getState().fetchDocument('1', 0, true);
    useDocumentStore.getState().startEditing();
  };

  const loadSecondPage = async () => {
    documentService.fetchDocument.mockResolvedValue(pageOf([3, 4]));
    await useDocumentStore.getState().fetchDocument('1', 2, false);
  };

  test('дагружаныя абзацы не лічацца новымі', async () => {
    await loadFirstPage();
    await loadSecondPage();

    expect(useDocumentStore.getState().documentData?.paragraphs).toHaveLength(
      4
    );
    expect(
      useDocumentStore.getState().originalDocumentData?.paragraphs
    ).toHaveLength(4);
    expect(useDocumentStore.getState().hasChanges()).toBe(false);

    expect(await operationsOnSave()).toHaveLength(0);
    expect(documentService.saveDocument).not.toHaveBeenCalled();
  });

  test('undo праз мяжу старонкі не выдаляе дагружаныя абзацы', async () => {
    await loadFirstPage();

    // Праўка да дагрузкі: яе здымак гісторыі таксама мусіць «даехаць» да 4 абзацаў
    useDocumentStore.getState().updateItemText(1, 1, 0, 'зьмененае');
    await loadSecondPage();
    useDocumentStore.getState().updateItemText(2, 2, 0, 'другое');

    expect(useDocumentStore.getState().history[0].paragraphs).toHaveLength(4);

    useDocumentStore.getState().undo();
    expect(useDocumentStore.getState().documentData?.paragraphs).toHaveLength(
      4
    );

    const operations = await operationsOnSave();
    expect(
      operations.filter(op => op.operationType === OperationType.Delete)
    ).toHaveLength(0);
    expect(
      operations.filter(op => op.operationType === OperationType.Create)
    ).toHaveLength(0);
    expect(operations).toEqual([
      expect.objectContaining({
        paragraphId: 1,
        operationType: OperationType.Update,
        concurrencyStamp: 'p1',
      }),
    ]);
  });

  test('няўдалая дагрузка не зносіць адкрыты дакумэнт', async () => {
    await loadFirstPage();

    documentService.fetchDocument.mockRejectedValue(new Error('офлайн'));
    await useDocumentStore.getState().fetchDocument('1', 2, false);

    const state = useDocumentStore.getState();
    expect(state.documentData?.paragraphs).toHaveLength(2);
    expect(state.error).toBeNull();
    expect(state.actionError).toBe('офлайн');
  });

  test('няўдалае захаваньне структуры не разьбірае старонку', async () => {
    await loadFirstPage();
    useDocumentStore.getState().updateItemText(1, 1, 0, 'зьмененае');

    documentService.saveDocument.mockRejectedValue(new Error('HTTP 409'));
    await useDocumentStore.getState().saveEditing();

    const state = useDocumentStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.saving).toBe(false);
    expect(state.actionError).toBe('HTTP 409');
    // Правкі засталіся на месцы
    expect(
      state.documentData?.paragraphs[0].sentences[0].sentenceItems[0]
        .linguisticItem.text
    ).toBe('зьмененае');
  });
});
