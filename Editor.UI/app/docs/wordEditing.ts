import {
  DocumentData,
  GrammarInfo,
  LinguisticErrorType,
  LinguisticItem,
  LinguisticTag,
  Paragraph,
  ParadigmFormId,
  ResolutionSource,
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

// Выбірае слова для панэлі рэдагаваньня. Абодва сторы чытаюцца праз getState, таму гэта звычайная функцыя - кампанэнтам не трэба на іх падпісвацца.
// Вяртае, ці было слова сапраўды знойдзена і выбрана.
export function selectWord(
  paragraphId: number,
  sentenceId: number,
  wordIndex: number
): boolean {
  const { documentData } = useDocumentStore.getState();
  const paragraph = documentData?.paragraphs.find(p => p.id === paragraphId);
  const sentence = paragraph?.sentences.find(s => s.id === sentenceId);
  if (!paragraph || !sentence || !sentence.sentenceItems[wordIndex]) {
    return false;
  }

  useUIStore
    .getState()
    .setSelectedWord(toSelectedWord(paragraph, sentence, wordIndex));
  return true;
}

// Наступнае неразьмечанае слова пасьля бягучага, з пераходам на пачатак дакумэнта.
// Дакумэнт праходзіцца адзін раз; SelectedWord ствараецца толькі для знойдзеных слоў.
export function findNextUnresolvedWord(
  documentData: DocumentData | null,
  current: WordPosition | null
): SelectedWord | null {
  if (!documentData) return null;

  // Першае неразьмечанае слова да бягучага - куды пяройдзем, дайшоўшы да канца
  let wrapAround: SelectedWord | null = null;
  let passedCurrent = current === null;

  for (const paragraph of documentData.paragraphs) {
    for (const sentence of paragraph.sentences) {
      for (let index = 0; index < sentence.sentenceItems.length; index++) {
        const item = sentence.sentenceItems[index].linguisticItem;
        if (item.type !== SentenceItemType.Word) continue;

        // Само бягучае слова не прапануем - нават калі яно яшчэ неразьмечанае
        const position = {
          paragraphId: paragraph.id,
          sentenceId: sentence.id,
          wordIndex: index,
        };
        if (current && isSameWord(position, current)) {
          passedCurrent = true;
          continue;
        }

        if (item.metadata?.resolvedOn) continue;

        if (passedCurrent) {
          return toSelectedWord(paragraph, sentence, index);
        }
        wrapAround ??= toSelectedWord(paragraph, sentence, index);
      }
    }
  }

  return wrapAround;
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
    resolvedBy: ResolutionSource.Human,
  },
});

// Вяртае разьметку слова да стану, які быў да няўдалага захаваньня
const restore = (previous: LinguisticItem) => (item: LinguisticItem) => ({
  ...item,
  paradigmFormId: previous.paradigmFormId,
  lemma: previous.lemma,
  linguisticTag: previous.linguisticTag,
  metadata: item.metadata
    ? {
        ...item.metadata,
        resolvedOn: previous.metadata?.resolvedOn ?? null,
        resolvedBy: previous.metadata?.resolvedBy,
      }
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
  const { addPendingSave, removePendingSave, setSaveError } =
    useUIStore.getState();

  // Паўторны выбар той самай парадыгмы - проста ідзем далей, нічога не мяняючы
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
  const { setSaveError } = useUIStore.getState();

  try {
    const newOptions: GrammarInfo[] = await documentService().updateWordText(
      documentId,
      word,
      text
    );

    // Тэкст зьмяніўся - старая разьметка больш не дзейнічае
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
  const { reloadDocument } = useDocumentStore.getState();
  const { addPendingSave, removePendingSave, setSaveError } =
    useUIStore.getState();

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
  const { addPendingSave, removePendingSave } = useUIStore.getState();

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
