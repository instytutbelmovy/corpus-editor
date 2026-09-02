import {
  DocumentData,
  GrammarInfo,
  LinguisticErrorType,
  LinguisticItem,
  LinguisticTag,
  Paragraph,
  ParadigmFormId,
  SelectedWord,
  Sentence,
  SentenceItem,
  SentenceItemType,
  WordPosition,
  WordRef,
} from './types';
import { serviceLocator } from '@/app/services/serviceLocator';
import { errorMessage } from '@/app/utils/errors';
import { useDocumentStore } from './store';
import { useUIStore } from './uiStore';

const documentService = () => serviceLocator.documentService;

export const wordKey = (word: WordPosition) =>
  `${word.paragraphId}-${word.sentenceId}-${word.wordIndex}`;

export const isSameWord = (a: WordPosition, b: WordPosition) =>
  a.paragraphId === b.paragraphId &&
  a.sentenceId === b.sentenceId &&
  a.wordIndex === b.wordIndex;

export const paradigmFormIdEquals = (
  a: ParadigmFormId | null,
  b: ParadigmFormId | null
) =>
  a !== null &&
  b !== null &&
  a.paradigmId === b.paradigmId &&
  a.variantId === b.variantId &&
  a.formTag === b.formTag;

export function toSelectedWord(
  paragraph: Paragraph,
  sentence: Sentence,
  wordIndex: number
): SelectedWord {
  const sentenceItem = sentence.sentenceItems[wordIndex];
  return {
    paragraphId: paragraph.id,
    paragraphStamp: paragraph.concurrencyStamp,
    sentenceId: sentence.id,
    sentenceStamp: sentence.concurrencyStamp,
    wordIndex,
    item: sentenceItem.linguisticItem,
    options: sentenceItem.options,
  };
}

const collectWords = (documentData: DocumentData): SelectedWord[] =>
  documentData.paragraphs.flatMap(paragraph =>
    paragraph.sentences.flatMap(sentence =>
      sentence.sentenceItems
        .map((_, index) => index)
        .filter(
          index =>
            sentence.sentenceItems[index].linguisticItem.type ===
            SentenceItemType.Word
        )
        .map(index => toSelectedWord(paragraph, sentence, index))
    )
  );

// Наступнае неразьмечанае слова пасьля бягучага, з пераходам на пачатак дакумэнта
export function findNextUnresolvedWord(
  documentData: DocumentData | null,
  current: WordPosition | null
): SelectedWord | null {
  if (!documentData) return null;

  const words = collectWords(documentData);
  if (words.length === 0) return null;

  const currentIndex = current
    ? words.findIndex(word => isSameWord(word, current))
    : -1;

  for (let offset = 1; offset <= words.length; offset++) {
    const word = words[(currentIndex + offset + words.length) % words.length];
    if (!word.item.metadata?.resolvedOn) {
      return word;
    }
  }

  return null;
}

// Нязьменнае абнаўленьне лінгвістычнага элемэнта слова
function patchItem(
  word: WordRef,
  patch: (item: LinguisticItem) => LinguisticItem
) {
  useDocumentStore.getState().updateSentenceItem(word, sentenceItem => ({
    ...sentenceItem,
    linguisticItem: patch(sentenceItem.linguisticItem),
  }));
}

function patchSentenceItem(
  word: WordRef,
  patch: (item: SentenceItem) => SentenceItem
) {
  useDocumentStore.getState().updateSentenceItem(word, patch);
}

const withResolvedNow = (item: LinguisticItem): LinguisticItem => ({
  ...item,
  metadata: {
    suggested: item.metadata?.suggested ?? null,
    ...item.metadata,
    resolvedOn: new Date().toISOString(),
  },
});

// Вяртае разьметку слова да стану, які быў да няўдалага захаваньня
const restore = (previous: LinguisticItem) => (item: LinguisticItem) => ({
  ...item,
  paradigmFormId: previous.paradigmFormId,
  lemma: previous.lemma,
  linguisticTag: previous.linguisticTag,
  metadata: item.metadata
    ? { ...item.metadata, resolvedOn: previous.metadata?.resolvedOn ?? null }
    : item.metadata,
});

const goToNextWord = (current: SelectedWord) => {
  const { documentData } = useDocumentStore.getState();
  useUIStore
    .getState()
    .setSelectedWord(findNextUnresolvedWord(documentData, current));
};

// Абнаўляе выбранае слова, толькі калі яно ўсё яшчэ выбранае
function updateSelectionIfCurrent(
  word: SelectedWord,
  next: Partial<SelectedWord> & { item: LinguisticItem }
) {
  const { selectedWord, setSelectedWord } = useUIStore.getState();
  if (selectedWord && isSameWord(selectedWord, word)) {
    setSelectedWord({ ...word, ...next });
  }
}

// Выбар парадыгмы: адразу пераходзім да наступнага слова, захаваньне ідзе ў фоне
export async function saveParadigmFormId(
  documentId: string,
  word: SelectedWord,
  paradigmFormId: ParadigmFormId
): Promise<void> {
  const { snapshot } = useDocumentStore.getState();
  const { addPendingSave, removePendingSave, setSaveError } =
    useUIStore.getState();

  snapshot();

  // Паўторны выбар той самай парадыгмы — проста ідзем далей
  if (paradigmFormIdEquals(word.item.paradigmFormId, paradigmFormId)) {
    goToNextWord(word);
    return;
  }

  const previousItem = word.item;
  const key = wordKey(word);

  goToNextWord(word);
  addPendingSave(key);

  const selectedOption = word.options.find(option =>
    paradigmFormIdEquals(option.paradigmFormId, paradigmFormId)
  );
  patchItem(word, item => ({
    ...item,
    paradigmFormId,
    lemma: selectedOption ? selectedOption.lemma : item.lemma,
    linguisticTag: selectedOption
      ? selectedOption.linguisticTag
      : item.linguisticTag,
  }));

  try {
    await documentService().saveParadigmFormId(
      documentId,
      word,
      paradigmFormId
    );
    patchItem(word, withResolvedNow);
  } catch (err) {
    patchItem(word, restore(previousItem));
    setSaveError(errorMessage(err));
    throw err;
  } finally {
    removePendingSave(key);
  }
}

// Праўка тэксту слова: бэкенд вяртае новыя варыянты парадыгмаў
export async function updateWordText(
  documentId: string,
  word: SelectedWord,
  text: string
): Promise<void> {
  const { snapshot } = useDocumentStore.getState();
  const { setSaveError } = useUIStore.getState();

  // Для новага (пустога) слова здымак не робім, каб undo выдаліла слова цалкам
  if (word.item.text !== '') {
    snapshot();
  }

  try {
    const newOptions: GrammarInfo[] = await documentService().updateWordText(
      documentId,
      word,
      text
    );

    // Тэкст зьмяніўся — старая разьметка больш не дзейнічае
    const clearedItem = (item: LinguisticItem): LinguisticItem => ({
      ...item,
      text,
      paradigmFormId: null,
      lemma: null,
      linguisticTag: null,
      metadata: item.metadata ? { ...item.metadata, resolvedOn: null } : null,
    });

    patchSentenceItem(word, sentenceItem => ({
      linguisticItem: clearedItem(sentenceItem.linguisticItem),
      options: newOptions,
    }));

    updateSelectionIfCurrent(word, {
      item: clearedItem(word.item),
      options: newOptions,
    });
  } catch (err) {
    setSaveError(errorMessage(err));
    throw err;
  }
}

// Ручны ўвод лемы і тэгу
export async function saveManualCategories(
  documentId: string,
  word: SelectedWord,
  lemma: string,
  linguisticTag: LinguisticTag
): Promise<void> {
  const { snapshot, reloadDocument } = useDocumentStore.getState();
  const { addPendingSave, removePendingSave, setSaveError } =
    useUIStore.getState();

  snapshot();

  const previousItem = word.item;
  const key = wordKey(word);
  addPendingSave(key);

  patchItem(word, item => ({
    ...item,
    paradigmFormId: null,
    lemma,
    linguisticTag,
  }));

  try {
    const tagString =
      linguisticTag.paradigmTag +
      (linguisticTag.formTag ? '|' + linguisticTag.formTag : '');

    await documentService().saveLemmaTag(documentId, word, lemma, tagString);

    patchItem(word, withResolvedNow);

    // Перачытваем дакумэнт у фоне, каб падцягнуць новыя кастомныя словы
    reloadDocument(documentId).catch(err =>
      console.error('Памылка перазагрузкі дакумэнта:', err)
    );

    goToNextWord(word);
  } catch (err) {
    patchItem(word, restore(previousItem));
    setSaveError(errorMessage(err));
    throw err;
  } finally {
    removePendingSave(key);
  }
}

// Камэнтар захоўваецца ціха: памылку толькі логуем
export async function saveComment(
  documentId: string,
  word: SelectedWord,
  comment: string
): Promise<void> {
  if (word.item.comment === comment) return;

  useDocumentStore.getState().snapshot();

  try {
    await documentService().saveComment(documentId, word, comment);

    patchItem(word, item => ({ ...item, comment }));
    updateSelectionIfCurrent(word, { item: { ...word.item, comment } });
  } catch (err) {
    console.error('Памылка захаваньня камэнтара:', err);
  }
}

export async function saveErrorType(
  documentId: string,
  word: SelectedWord,
  errorType: LinguisticErrorType
): Promise<void> {
  const { snapshot } = useDocumentStore.getState();
  const { addPendingSave, removePendingSave } = useUIStore.getState();

  snapshot();

  const key = wordKey(word);
  addPendingSave(key);

  try {
    await documentService().saveErrorType(documentId, word, errorType);

    const withErrorType = (item: LinguisticItem): LinguisticItem => ({
      ...item,
      metadata: {
        suggested: item.metadata?.suggested ?? null,
        resolvedOn: item.metadata?.resolvedOn ?? null,
        errorType,
      },
    });

    patchItem(word, withErrorType);
    updateSelectionIfCurrent(word, { item: withErrorType(word.item) });
  } catch (err) {
    console.error('Памылка захаваньня тыпу памылкі:', err);
  } finally {
    removePendingSave(key);
  }
}
