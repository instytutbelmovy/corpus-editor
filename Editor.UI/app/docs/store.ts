import { create } from 'zustand';
import {
  DocumentData,
  DocumentHeader,
  Paragraph,
  ParagraphOperation,
  OperationType,
  Sentence,
  SentenceItem,
  UploadJobState,
  UploadJobStatus,
  WordRef,
} from './types';
import { serviceLocator } from '@/app/services/serviceLocator';
import { StructureEditor } from './structureEditor';
import { useUIStore } from './uiStore';
import { errorMessage } from '@/app/utils/errors';

// Колькасьць абзацаў на старонку пры бясконцай пракрутцы
const PAGE_SIZE = 20;

type Editor = (data: DocumentData) => DocumentData;

// Ці аднолькавыя сьпісы заданьняў з пункту гледжаньня таго, што паказвае табліца
const sameJobs = (a: UploadJobStatus[], b: UploadJobStatus[]) =>
  a.length === b.length &&
  a.every((job, i) => {
    const other = b[i];
    return (
      job.id === other.id &&
      job.state === other.state &&
      job.stage === other.stage &&
      job.processedTokens === other.processedTokens &&
      job.totalTokens === other.totalTokens &&
      job.error === other.error
    );
  });

// Забываем схаваныя заданьні, якіх сэрвэр ужо не аддае - каб мноства не расло бясконца
const pruneDismissed = (dismissed: Set<string>, jobs: UploadJobStatus[]) => {
  if (dismissed.size === 0) return dismissed;

  const alive = new Set(jobs.map(job => job.id));
  const kept = [...dismissed].filter(id => alive.has(id));
  return kept.length === dismissed.size ? dismissed : new Set(kept);
};

interface DocumentState {
  // Данныя дакумэнта
  documentData: DocumentData | null;
  // Захаваны стан, ад якога лічацца апэрацыі рэдагаваньня структуры
  originalDocumentData: DocumentData | null;
  documentsList: DocumentHeader[];
  // Заданьні фонавай апрацоўкі загружаных дакумэнтаў (без Succeeded - тыя ўжо ў documentsList)
  uploadJobs: UploadJobStatus[];
  // n дакумэнтаў, чые заданьні толькі што завяршыліся - для кароткай падсьветкі радка
  recentlyCompletedIds: Set<number>;
  // Схаваныя карыстальнікам заданьні (толькі памылковыя): сэрвэр аддае іх яшчэ гадзіну, таму трэба помніць
  dismissedJobIds: Set<string>;
  // Стан кожнага заданьня з папярэдняга апытаньня, ужо ўключна з Succeeded - інакш завершанае заданьне
  // лічылася б "новым" на кожным цыкле і бясконца перачытвала б сьпіс дакумэнтаў
  _seenJobStates: Map<string, UploadJobState>;
  // Ці быў ужо адзін апытальны цыкл - каб не "падсьвечваць" заданьні, ужо завершаныя да загрузкі старонкі
  _uploadJobsPolled: boolean;

  // Гісторыя для undo/redo
  history: DocumentData[];
  historyIndex: number;

  // Стан загрузкі.
  // error - толькі фатальная памылка першай загрузкі: замяняе старонку.
  // actionError - нефатальная (захаваньне структуры, дагрузка абзацаў): банэр па-над дакумэнтам.
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  saving: boolean;
  actionError: string | null;

  // Пагінацыя
  hasMore: boolean;
  lastParagraphId: number;

  // Дзеяньні
  fetchDocument: (
    documentId: string,
    skipUpToId?: number,
    isInitial?: boolean
  ) => Promise<void>;
  reloadDocument: (documentId: string) => Promise<void>;
  // silent - фонавае абнаўленьне: не замяняе старонку экранам загрузкі і не зносіць сьпіс пры памылцы
  fetchDocuments: (options?: { silent?: boolean }) => Promise<void>;
  refreshDocumentHeader: (documentId: number) => Promise<void>;
  refreshDocumentsList: () => Promise<void>;
  pollUploadJobs: () => Promise<void>;
  dismissUploadJob: (jobId: string) => void;
  // Нязьменнае абнаўленьне аднаго слова
  updateSentenceItem: (
    word: WordRef,
    patch: (item: SentenceItem) => SentenceItem
  ) => void;
  clearDocument: () => void;
  setError: (error: string | null) => void;
  clearActionError: () => void;

  // Рэдагаваньне структуры
  undo: () => void;
  redo: () => void;
  cancelEditing: () => void;
  saveEditing: () => Promise<void>;
  startEditing: () => void;
  hasChanges: () => boolean;

  addWord: (paragraphId: number, sentenceId: number, wordIndex: number) => void;
  addPunctuation: (
    paragraphId: number,
    sentenceId: number,
    wordIndex: number
  ) => void;
  addLineBreak: (
    paragraphId: number,
    sentenceId: number,
    wordIndex: number
  ) => void;
  splitSentence: (
    paragraphId: number,
    sentenceId: number,
    splitIndex: number
  ) => void;
  splitParagraph: (paragraphId: number, sentenceId: number) => void;
  joinSentence: (paragraphId: number, sentenceId: number) => void;
  joinParagraph: (paragraphId: number) => void;
  deleteItem: (
    paragraphId: number,
    sentenceId: number,
    itemIndex: number
  ) => void;
  setGlue: (
    paragraphId: number,
    sentenceId: number,
    itemIndex: number,
    glueNext: boolean
  ) => void;
  updateItemText: (
    paragraphId: number,
    sentenceId: number,
    itemIndex: number,
    text: string,
    replaceHistory?: boolean
  ) => void;

  _edit: (editor: Editor, replaceHistory?: boolean) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  // Пачатковы стан
  documentData: null,
  originalDocumentData: null,
  documentsList: [],
  uploadJobs: [],
  recentlyCompletedIds: new Set(),
  dismissedJobIds: new Set(),
  _seenJobStates: new Map(),
  _uploadJobsPolled: false,
  history: [],
  historyIndex: -1,
  loading: false,
  loadingMore: false,
  error: null,
  saving: false,
  actionError: null,
  hasMore: true,
  lastParagraphId: 0,

  fetchDocument: async (documentId, skipUpToId = 0, isInitial = false) => {
    try {
      set(
        isInitial
          ? { loading: true, error: null, actionError: null }
          : { loadingMore: true, actionError: null }
      );

      const data = await serviceLocator.documentService.fetchDocument(
        documentId,
        skipUpToId
      );
      const lastParagraphId = data.paragraphs.at(-1)?.id ?? 0;
      const hasMore = data.paragraphs.length === PAGE_SIZE;

      if (isInitial) {
        set({
          documentData: data,
          originalDocumentData: structuredClone(data),
          lastParagraphId,
          hasMore,
          loading: false,
          history: [],
          historyIndex: -1,
        });
      } else {
        // Усе здымкі дакумэнта мусяць апісваць адно і тое ж загружанае акно: інакш дыф па stamp'ах прыдумае Create для дагружаных абзацаў (а пасьля undo - Delete).
        set(state => {
          if (!state.documentData) {
            return {
              documentData: data,
              lastParagraphId,
              hasMore,
              loadingMore: false,
            };
          }

          const append = (doc: DocumentData, paragraphs: Paragraph[]) => ({
            ...doc,
            paragraphs: [...doc.paragraphs, ...paragraphs],
          });

          return {
            documentData: append(state.documentData, data.paragraphs),
            // Арыгінал усюды трымаецца глыбокай копіяй - не пачынаем дзяліць абзацы з жывым дрэвам
            originalDocumentData: state.originalDocumentData
              ? append(
                  state.originalDocumentData,
                  structuredClone(data.paragraphs)
                )
              : null,
            history: state.history.map(entry => append(entry, data.paragraphs)),
            lastParagraphId,
            hasMore,
            loadingMore: false,
          };
        });
      }
    } catch (err) {
      // Няўдалая дагрузка не мусіць зносіць ужо адкрыты дакумэнт
      set(
        isInitial
          ? { error: errorMessage(err), loading: false }
          : { actionError: errorMessage(err), loadingMore: false }
      );
    }
  },

  // Перачытвае ўжо загружаныя абзацы (напр. каб падцягнуць новыя кастомныя словы)
  reloadDocument: async (documentId: string) => {
    const { documentData, lastParagraphId } = get();
    if (!documentData || lastParagraphId === 0) return;

    const take = Math.max(
      ...documentData.paragraphs.map(p => p.id),
      lastParagraphId
    );
    const data = await serviceLocator.documentService.fetchDocument(
      documentId,
      0,
      take
    );

    set(state => ({
      documentData: state.documentData
        ? { ...state.documentData, paragraphs: data.paragraphs }
        : null,
    }));
  },

  fetchDocuments: async ({ silent = false } = {}) => {
    try {
      if (!silent) set({ loading: true, error: null });
      const documents = await serviceLocator.documentService.fetchDocuments();
      set(
        silent
          ? { documentsList: documents }
          : { documentsList: documents, loading: false }
      );
    } catch (err) {
      // Фонавае абнаўленьне не мусіць зносіць ужо паказаны сьпіс
      if (silent) console.error('Failed to refresh documents list:', err);
      else set({ error: errorMessage(err), loading: false });
    }
  },

  refreshDocumentHeader: async (documentId: number) => {
    try {
      const updatedHeader =
        await serviceLocator.documentService.refreshDocument(documentId);
      set(state => ({
        documentsList: state.documentsList.map(doc =>
          doc.n === documentId ? updatedHeader : doc
        ),
      }));
    } catch (err) {
      console.error('Failed to refresh document:', err);
    }
  },

  refreshDocumentsList: async () => {
    try {
      set({ loading: true, error: null });
      const documents =
        await serviceLocator.documentService.refreshDocumentsList();
      set({ documentsList: documents, loading: false });
    } catch (err) {
      set({ error: errorMessage(err), loading: false });
    }
  },

  pollUploadJobs: async () => {
    try {
      const jobs = await serviceLocator.documentService.getUploadJobs();
      const { dismissedJobIds, _seenJobStates, _uploadJobsPolled } = get();

      // На першым апытаньні пасьля адкрыцьця старонкі ня ведаем, ці заданьне толькі што завяршылася, ці ўжо даўно - таму падсьветку не запускаем
      if (_uploadJobsPolled) {
        const newlySucceeded = jobs.filter(
          job =>
            job.state === UploadJobState.Succeeded &&
            _seenJobStates.get(job.id) !== UploadJobState.Succeeded
        );

        if (newlySucceeded.length > 0) {
          await get().fetchDocuments({ silent: true });
          set(state => ({
            recentlyCompletedIds: new Set([
              ...state.recentlyCompletedIds,
              ...newlySucceeded.map(job => job.n),
            ]),
          }));
          for (const job of newlySucceeded) {
            setTimeout(() => {
              set(state => {
                if (!state.recentlyCompletedIds.has(job.n)) return state;
                const recentlyCompletedIds = new Set(
                  state.recentlyCompletedIds
                );
                recentlyCompletedIds.delete(job.n);
                return { recentlyCompletedIds };
              });
            }, 1500);
          }
        }
      }

      const visibleJobs = jobs.filter(
        job =>
          job.state !== UploadJobState.Succeeded && !dismissedJobIds.has(job.id)
      );

      set(state => ({
        // Захоўваем ранейшы масіў, калі нічога не зьмянілася - інакш кожнае апытаньне перамалёўвала б старонку
        uploadJobs: sameJobs(state.uploadJobs, visibleJobs)
          ? state.uploadJobs
          : visibleJobs,
        // Сэрвэр урэшце выцясьняе заданьні - разам зь імі забываем і схаваныя
        dismissedJobIds: pruneDismissed(state.dismissedJobIds, jobs),
        _seenJobStates: new Map(jobs.map(job => [job.id, job.state])),
        _uploadJobsPolled: true,
      }));
    } catch (err) {
      console.error('Failed to poll upload jobs:', err);
    }
  },

  dismissUploadJob: (jobId: string) =>
    set(state => ({
      uploadJobs: state.uploadJobs.filter(job => job.id !== jobId),
      dismissedJobIds: new Set(state.dismissedJobIds).add(jobId),
    })),

  updateSentenceItem: (word, patch) =>
    set(state => {
      const { documentData } = state;
      if (!documentData) return {};

      let changed = false;
      const paragraphs = documentData.paragraphs.map(paragraph => {
        if (paragraph.id !== word.paragraphId) return paragraph;
        return {
          ...paragraph,
          sentences: paragraph.sentences.map(sentence => {
            if (sentence.id !== word.sentenceId) return sentence;
            const item = sentence.sentenceItems[word.wordIndex];
            if (!item) return sentence;

            changed = true;
            const sentenceItems = [...sentence.sentenceItems];
            sentenceItems[word.wordIndex] = patch(item);
            return { ...sentence, sentenceItems };
          }),
        };
      });

      return changed ? { documentData: { ...documentData, paragraphs } } : {};
    }),

  clearDocument: () =>
    set({
      documentData: null,
      error: null,
      actionError: null,
      hasMore: true,
      lastParagraphId: 0,
    }),

  setError: (error: string | null) => set({ error }),

  clearActionError: () => set({ actionError: null }),

  // Рэдагаваньне структуры

  undo: () => {
    const { history, historyIndex, originalDocumentData } = get();

    if (historyIndex > 0) {
      set({
        documentData: history[historyIndex - 1],
        historyIndex: historyIndex - 1,
      });
    } else if (historyIndex === 0 && originalDocumentData) {
      set({
        documentData: structuredClone(originalDocumentData),
        historyIndex: -1,
      });
    }
    useUIStore.getState().clearSelectedWord();
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        documentData: history[historyIndex + 1],
        historyIndex: historyIndex + 1,
      });
    }
    useUIStore.getState().clearSelectedWord();
  },

  cancelEditing: () => {
    const { originalDocumentData } = get();
    if (originalDocumentData) {
      set({
        documentData: structuredClone(originalDocumentData),
        history: [],
        historyIndex: -1,
      });
    }
  },

  saveEditing: async () => {
    const { documentData, originalDocumentData } = get();
    if (!documentData || !originalDocumentData) return;

    const operations = calculateOperations(originalDocumentData, documentData);
    if (operations.length === 0) return;

    try {
      // Не loading/error: старонка не мусіць разьбірацца, пакуль ідзе захаваньне - інакш пры памылцы (напр. 409) правкі застаюцца ў памяці, але недасяжныя
      set({ saving: true, actionError: null });

      const response = await serviceLocator.documentService.saveDocument(
        documentData.header.n,
        operations
      );

      // Замяняем адрэдагаваныя абзацы на вернутыя бэкендам (зь іх новымі stamp'амі)
      const editedById = new Map(
        response.editedParagraphs.map(paragraph => [paragraph.id, paragraph])
      );
      for (const edited of response.editedParagraphs) {
        if (!documentData.paragraphs.some(p => p.id === edited.id)) {
          console.error(
            `Received update for unknown paragraph ID: ${edited.id}`
          );
        }
      }

      const newDocumentData = {
        ...documentData,
        paragraphs: documentData.paragraphs.map(
          paragraph => editedById.get(paragraph.id) ?? paragraph
        ),
      };

      set({
        documentData: newDocumentData,
        originalDocumentData: structuredClone(newDocumentData),
        history: [],
        historyIndex: -1,
        saving: false,
      });
    } catch (err) {
      set({ actionError: errorMessage(err), saving: false });
    }
  },

  startEditing: () => {
    const { documentData } = get();
    if (documentData) {
      set({
        originalDocumentData: structuredClone(documentData),
        history: [],
        historyIndex: -1,
      });
    }
  },

  hasChanges: () => {
    const { documentData, originalDocumentData } = get();
    if (!documentData || !originalDocumentData) return false;
    return calculateOperations(originalDocumentData, documentData).length > 0;
  },

  addWord: (paragraphId, sentenceId, wordIndex) =>
    get()._edit(data =>
      StructureEditor.addWord(data, paragraphId, sentenceId, wordIndex)
    ),

  addPunctuation: (paragraphId, sentenceId, wordIndex) =>
    get()._edit(data =>
      StructureEditor.addPunctuation(data, paragraphId, sentenceId, wordIndex)
    ),

  addLineBreak: (paragraphId, sentenceId, wordIndex) =>
    get()._edit(data =>
      StructureEditor.addLineBreak(data, paragraphId, sentenceId, wordIndex)
    ),

  splitSentence: (paragraphId, sentenceId, splitIndex) =>
    get()._edit(data =>
      StructureEditor.splitSentence(data, paragraphId, sentenceId, splitIndex)
    ),

  splitParagraph: (paragraphId, sentenceId) =>
    get()._edit(data =>
      StructureEditor.splitParagraph(data, paragraphId, sentenceId)
    ),

  joinSentence: (paragraphId, sentenceId) =>
    get()._edit(data =>
      StructureEditor.joinSentence(data, paragraphId, sentenceId)
    ),

  joinParagraph: paragraphId =>
    get()._edit(data => StructureEditor.joinParagraph(data, paragraphId)),

  deleteItem: (paragraphId, sentenceId, itemIndex) =>
    get()._edit(data =>
      StructureEditor.deleteItem(data, paragraphId, sentenceId, itemIndex)
    ),

  setGlue: (paragraphId, sentenceId, itemIndex, glueNext) =>
    get()._edit(data =>
      StructureEditor.setGlue(
        data,
        paragraphId,
        sentenceId,
        itemIndex,
        glueNext
      )
    ),

  updateItemText: (
    paragraphId,
    sentenceId,
    itemIndex,
    text,
    replaceHistory = false
  ) =>
    get()._edit(
      data =>
        StructureEditor.updateItemText(
          data,
          paragraphId,
          sentenceId,
          itemIndex,
          text
        ),
      replaceHistory
    ),

  // Ужывае рэдагаваньне і кладзе новы стан у гісторыю.
  // replaceHistory замяняе апошні запіс замест новага (набор тэксту ў толькі што дададзеным слове).
  _edit: (editor, replaceHistory = false) => {
    const { documentData, history, historyIndex } = get();
    if (!documentData) return;

    const newDocumentData = editor(documentData);
    // Некаторыя апэрацыі StructureEditor - no-op (напр. злучэньне апошняга абзаца): вяртаюць той самы аб'ект
    if (newDocumentData === documentData) return;

    // Пасьля undo новае рэдагаваньне абразае «будучыню»
    const newHistory = history.slice(0, historyIndex + 1);

    if (replaceHistory && historyIndex >= 0) {
      newHistory[historyIndex] = newDocumentData;
      set({ documentData: newDocumentData, history: newHistory });
    } else {
      newHistory.push(newDocumentData);
      set({
        documentData: newDocumentData,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    }
  },
}));

// Дыф абзацаў па concurrencyStamp: што стварыць, што абнавіць, што выдаліць.
// paragraphId у апэрацыі - гэта пазыцыя ў дакумэнце, які будуецца бэкендам.
function calculateOperations(
  original: DocumentData,
  current: DocumentData
): ParagraphOperation[] {
  const operations: ParagraphOperation[] = [];

  const originalIndexByStamp = new Map<string, number>();
  original.paragraphs.forEach((p, index) =>
    originalIndexByStamp.set(p.concurrencyStamp, index)
  );

  // Пазыцыя ў `original`, зь якой шукаем супадзеньні далей
  let virtualIndex = 0;

  for (let i = 0; i < current.paragraphs.length; i++) {
    const currentP = current.paragraphs[i];
    const origIdx = originalIndexByStamp.get(currentP.concurrencyStamp);

    if (origIdx === undefined || origIdx < virtualIndex) {
      // Няма ў астатку арыгінала - новы абзац
      operations.push({
        paragraphId: i + 1,
        operationType: OperationType.Create,
        replacementSentences: toSentenceItems(currentP.sentences),
        concurrencyStamp: null,
      });
      continue;
    }

    // Усё, што прапушчана паміж virtualIndex і origIdx, было выдалена
    for (let k = virtualIndex; k < origIdx; k++) {
      operations.push({
        paragraphId: i + 1,
        operationType: OperationType.Delete,
        replacementSentences: null,
        concurrencyStamp: original.paragraphs[k].concurrencyStamp,
      });
    }

    const originalP = original.paragraphs[origIdx];
    const originalContent = JSON.stringify(
      toSentenceItems(originalP.sentences)
    );
    const currentContent = JSON.stringify(toSentenceItems(currentP.sentences));

    if (originalContent !== currentContent) {
      operations.push({
        paragraphId: i + 1,
        operationType: OperationType.Update,
        replacementSentences: toSentenceItems(currentP.sentences),
        concurrencyStamp: originalP.concurrencyStamp,
      });
    }

    virtualIndex = origIdx + 1;
  }

  // Абзацы ў хвасьце арыгінала, да якіх мы не дайшлі
  for (let k = virtualIndex; k < original.paragraphs.length; k++) {
    operations.push({
      paragraphId: current.paragraphs.length + 1,
      operationType: OperationType.Delete,
      replacementSentences: null,
      concurrencyStamp: original.paragraphs[k].concurrencyStamp,
    });
  }

  return operations;
}

const toSentenceItems = (sentences: Sentence[]) =>
  sentences.map(sentence =>
    sentence.sentenceItems.map(item => item.linguisticItem)
  );
