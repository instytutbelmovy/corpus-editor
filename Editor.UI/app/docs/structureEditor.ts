import {
  DocumentData,
  Paragraph,
  Sentence,
  SentenceItem,
  SentenceItemType,
} from './types';

// Чыстыя аперацыі над структурай дакумэнта: кожная вяртае новы DocumentData.
// Апэрацыі для бэкенду не будуюцца тут — store вылічвае іх дыфам пры захаваньні.

const findParagraph = (data: DocumentData, paragraphId: number): Paragraph => {
  const paragraph = data.paragraphs.find(p => p.id === paragraphId);
  if (!paragraph) throw new Error('Paragraph not found');
  return paragraph;
};

const findSentence = (paragraph: Paragraph, sentenceId: number): Sentence => {
  const sentence = paragraph.sentences.find(s => s.id === sentenceId);
  if (!sentence) throw new Error('Sentence not found');
  return sentence;
};

const makeItem = (
  type: SentenceItemType,
  text = '',
  glueNext = false
): SentenceItem => ({
  linguisticItem: {
    text,
    type,
    lemma: null,
    linguisticTag: null,
    paradigmFormId: null,
    comment: '',
    metadata: null,
    glueNext,
  },
  options: [],
});

// Устаўляе элемэнт пасьля wordIndex.
// Слова: калі левы сусед быў зьлеплены з наступным, зьляпленьне пераходзіць на новае слова.
// Пунктуацыя і перанос: пераймаюць glueNext левага суседа, не мяняючы яго.
function insertItem(
  data: DocumentData,
  paragraphId: number,
  sentenceId: number,
  wordIndex: number,
  type: SentenceItemType,
  text = ''
): DocumentData {
  const newData = structuredClone(data);
  const sentence = findSentence(
    findParagraph(newData, paragraphId),
    sentenceId
  );

  const newItem = makeItem(type, text);
  const leftItem = sentence.sentenceItems[wordIndex];

  if (leftItem) {
    if (type === SentenceItemType.Word) {
      if (leftItem.linguisticItem.glueNext) {
        leftItem.linguisticItem.glueNext = false;
        newItem.linguisticItem.glueNext = true;
      }
    } else {
      newItem.linguisticItem.glueNext = leftItem.linguisticItem.glueNext;
    }
  }

  sentence.sentenceItems.splice(wordIndex + 1, 0, newItem);
  return newData;
}

export const StructureEditor = {
  addWord: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    wordIndex: number
  ): DocumentData =>
    insertItem(
      data,
      paragraphId,
      sentenceId,
      wordIndex,
      SentenceItemType.Word
    ),

  addPunctuation: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    wordIndex: number
  ): DocumentData =>
    insertItem(
      data,
      paragraphId,
      sentenceId,
      wordIndex,
      SentenceItemType.Punctuation
    ),

  addLineBreak: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    wordIndex: number
  ): DocumentData =>
    insertItem(
      data,
      paragraphId,
      sentenceId,
      wordIndex,
      SentenceItemType.LineBreak,
      '\n'
    ),

  deleteItem: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    itemIndex: number
  ): DocumentData => {
    const newData = structuredClone(data);
    const paragraphIndex = newData.paragraphs.findIndex(
      p => p.id === paragraphId
    );
    if (paragraphIndex === -1) throw new Error('Paragraph not found');
    const paragraph = newData.paragraphs[paragraphIndex];

    const sentenceIndex = paragraph.sentences.findIndex(
      s => s.id === sentenceId
    );
    if (sentenceIndex === -1) throw new Error('Sentence not found');
    const sentence = paragraph.sentences[sentenceIndex];

    // Пры выдаленьні зьлепленага слова зьляпленьне пераходзіць на левага суседа.
    // У пунктуацыі glueNext ні на што не ўплывае.
    const itemToDelete = sentence.sentenceItems[itemIndex];
    const leftItem = sentence.sentenceItems[itemIndex - 1];
    if (
      itemToDelete.linguisticItem.type === SentenceItemType.Word &&
      itemToDelete.linguisticItem.glueNext &&
      leftItem
    ) {
      leftItem.linguisticItem.glueNext = true;
    }

    sentence.sentenceItems.splice(itemIndex, 1);

    if (sentence.sentenceItems.length === 0) {
      paragraph.sentences.splice(sentenceIndex, 1);
    }

    if (paragraph.sentences.length === 0) {
      newData.paragraphs.splice(paragraphIndex, 1);
      shiftParagraphIds(newData, paragraphIndex, -1);
    }

    return newData;
  },

  // splitIndex — індэкс апошняга элемэнта першага сказа
  splitSentence: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    splitIndex: number
  ): DocumentData => {
    const newData = structuredClone(data);
    const paragraph = findParagraph(newData, paragraphId);
    const sentenceIndex = paragraph.sentences.findIndex(
      s => s.id === sentenceId
    );
    if (sentenceIndex === -1) throw new Error('Sentence not found');
    const sentence = paragraph.sentences[sentenceIndex];

    const secondPartItems = sentence.sentenceItems.slice(splitIndex + 1);
    if (secondPartItems.length === 0) return data;

    sentence.sentenceItems = sentence.sentenceItems.slice(0, splitIndex + 1);

    // Часовыя id і stamp: бэкенд перавызначыць іх пры захаваньні
    paragraph.sentences.splice(sentenceIndex + 1, 0, {
      id: Math.max(...paragraph.sentences.map(s => s.id), 0) + 1,
      concurrencyStamp: crypto.randomUUID(),
      sentenceItems: secondPartItems,
    });

    return newData;
  },

  // Далучае да сказа наступны
  joinSentence: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number
  ): DocumentData => {
    const newData = structuredClone(data);
    const paragraph = findParagraph(newData, paragraphId);
    const sentenceIndex = paragraph.sentences.findIndex(
      s => s.id === sentenceId
    );
    if (sentenceIndex === -1) throw new Error('Sentence not found');
    if (sentenceIndex >= paragraph.sentences.length - 1) return data;

    const [secondSentence] = paragraph.sentences.splice(sentenceIndex + 1, 1);
    paragraph.sentences[sentenceIndex].sentenceItems.push(
      ...secondSentence.sentenceItems
    );

    return newData;
  },

  // sentenceId — першы сказ новага абзаца
  splitParagraph: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number
  ): DocumentData => {
    const newData = structuredClone(data);
    const paragraphIndex = newData.paragraphs.findIndex(
      p => p.id === paragraphId
    );
    if (paragraphIndex === -1) throw new Error('Paragraph not found');
    const paragraph = newData.paragraphs[paragraphIndex];

    const sentenceIndex = paragraph.sentences.findIndex(
      s => s.id === sentenceId
    );
    if (sentenceIndex === -1) throw new Error('Sentence not found');
    if (sentenceIndex === 0) return data;

    const secondParagraphSentences = paragraph.sentences.slice(sentenceIndex);
    paragraph.sentences = paragraph.sentences.slice(0, sentenceIndex);

    newData.paragraphs.splice(paragraphIndex + 1, 0, {
      id: paragraphId + 1,
      concurrencyStamp: crypto.randomUUID(),
      sentences: secondParagraphSentences,
    });
    shiftParagraphIds(newData, paragraphIndex + 2, 1);

    return newData;
  },

  // Далучае да абзаца наступны
  joinParagraph: (data: DocumentData, paragraphId: number): DocumentData => {
    const newData = structuredClone(data);
    const paragraphIndex = newData.paragraphs.findIndex(
      p => p.id === paragraphId
    );
    if (paragraphIndex === -1) throw new Error('Paragraph not found');
    if (paragraphIndex >= newData.paragraphs.length - 1) return data;

    const firstParagraph = newData.paragraphs[paragraphIndex];
    const [secondParagraph] = newData.paragraphs.splice(paragraphIndex + 1, 1);

    // Перанумароўваем сказы другога абзаца, каб id засталіся ўнікальнымі ў межах абзаца
    const maxFirstId = Math.max(...firstParagraph.sentences.map(s => s.id), 0);
    firstParagraph.sentences.push(
      ...secondParagraph.sentences.map((sentence, index) => ({
        ...sentence,
        id: maxFirstId + 1 + index,
      }))
    );

    shiftParagraphIds(newData, paragraphIndex + 1, -1);

    return newData;
  },

  setGlue: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    itemIndex: number,
    glueNext: boolean
  ): DocumentData =>
    patchItem(data, paragraphId, sentenceId, itemIndex, item => {
      item.glueNext = glueNext;
    }),

  updateItemText: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    itemIndex: number,
    text: string
  ): DocumentData =>
    patchItem(data, paragraphId, sentenceId, itemIndex, item => {
      item.text = text;
    }),
};

function patchItem(
  data: DocumentData,
  paragraphId: number,
  sentenceId: number,
  itemIndex: number,
  patch: (item: SentenceItem['linguisticItem']) => void
): DocumentData {
  const newData = structuredClone(data);
  const sentence = findSentence(
    findParagraph(newData, paragraphId),
    sentenceId
  );
  const item = sentence.sentenceItems[itemIndex];
  if (!item) throw new Error('Item not found');

  patch(item.linguisticItem);
  return newData;
}

// Нумары абзацаў — гэта іх пазыцыі, таму пасьля ўстаўкі/выдаленьня іх трэба зрушыць
function shiftParagraphIds(
  data: DocumentData,
  fromIndex: number,
  delta: number
): void {
  for (let i = fromIndex; i < data.paragraphs.length; i++) {
    data.paragraphs[i].id += delta;
  }
}
