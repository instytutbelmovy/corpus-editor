import { StructureEditor } from '@/app/docs/structureEditor';
import {
  DocumentData,
  DocumentHeader,
  Paragraph,
  Sentence,
  SentenceItem,
  SentenceItemType,
} from '@/app/docs/types';

const createMockItem = (
  text: string,
  type: SentenceItemType = SentenceItemType.Word,
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

const createMockSentence = (id: number, text: string): Sentence => ({
  id,
  concurrencyStamp: 'sentence-stamp',
  sentenceItems: [createMockItem(text)],
});

const createMockParagraph = (id: number, sentences: Sentence[]): Paragraph => ({
  id,
  concurrencyStamp: 'paragraph-stamp',
  sentences,
});

const createMockData = (): DocumentData => ({
  header: {} as DocumentHeader,
  paragraphs: [
    createMockParagraph(1, [createMockSentence(1, 'Hello')]),
    createMockParagraph(2, [createMockSentence(1, 'World')]),
  ],
});

const itemsOf = (data: DocumentData, paragraphIndex = 0, sentenceIndex = 0) =>
  data.paragraphs[paragraphIndex].sentences[sentenceIndex].sentenceItems;

describe('StructureEditor', () => {
  it('should add a word', () => {
    const data = createMockData();
    const result = StructureEditor.addWord(data, 1, 1, 0);

    expect(itemsOf(result)).toHaveLength(2);
    expect(itemsOf(result)[1].linguisticItem.type).toBe(SentenceItemType.Word);
    // Зыходныя данныя не мяняюцца
    expect(itemsOf(data)).toHaveLength(1);
  });

  it('should move glue to the added word', () => {
    const data = createMockData();
    itemsOf(data)[0].linguisticItem.glueNext = true;

    const result = StructureEditor.addWord(data, 1, 1, 0);

    expect(itemsOf(result)[0].linguisticItem.glueNext).toBe(false);
    expect(itemsOf(result)[1].linguisticItem.glueNext).toBe(true);
  });

  it('should copy glue onto added punctuation', () => {
    const data = createMockData();
    itemsOf(data)[0].linguisticItem.glueNext = true;

    const result = StructureEditor.addPunctuation(data, 1, 1, 0);

    expect(itemsOf(result)[0].linguisticItem.glueNext).toBe(true);
    expect(itemsOf(result)[1].linguisticItem.glueNext).toBe(true);
    expect(itemsOf(result)[1].linguisticItem.type).toBe(
      SentenceItemType.Punctuation
    );
  });

  it('should split a sentence', () => {
    const data = createMockData();
    itemsOf(data).push(createMockItem('World'));

    const result = StructureEditor.splitSentence(data, 1, 1, 0);

    expect(result.paragraphs[0].sentences).toHaveLength(2);
    expect(itemsOf(result, 0, 0)).toHaveLength(1);
    expect(itemsOf(result, 0, 1)).toHaveLength(1);
  });

  it('should join sentences', () => {
    const data = createMockData();
    data.paragraphs[0].sentences.push(createMockSentence(2, 'World'));

    const result = StructureEditor.joinSentence(data, 1, 1);

    expect(result.paragraphs[0].sentences).toHaveLength(1);
    expect(itemsOf(result)).toHaveLength(2);
  });

  it('should split a paragraph', () => {
    const data = createMockData();
    data.paragraphs[0].sentences.push(createMockSentence(2, 'World'));

    const result = StructureEditor.splitParagraph(data, 1, 2);

    expect(result.paragraphs).toHaveLength(3);
    expect(result.paragraphs[0].sentences).toHaveLength(1);
    expect(result.paragraphs[1].sentences).toHaveLength(1);
    // Нумары наступных абзацаў зрушаныя
    expect(result.paragraphs[2].id).toBe(3);
  });

  it('should join paragraphs', () => {
    const data = createMockData();

    const result = StructureEditor.joinParagraph(data, 1);

    expect(result.paragraphs).toHaveLength(1);
    expect(result.paragraphs[0].sentences).toHaveLength(2);
    // Сказы далучанага абзаца перанумараваныя
    expect(result.paragraphs[0].sentences.map(s => s.id)).toEqual([1, 2]);
  });

  it('should delete an item and remove sentence if empty', () => {
    const data = createMockData();
    const result = StructureEditor.deleteItem(data, 1, 1, 0);

    expect(result.paragraphs).toHaveLength(1);
    expect(result.paragraphs[0].sentences).toHaveLength(1);
    // Абзац 2 стаў абзацам 1
    expect(result.paragraphs[0].id).toBe(1);
  });

  it('should move glue left when deleting a glued word', () => {
    const data = createMockData();
    itemsOf(data)[0].linguisticItem.glueNext = true;
    itemsOf(data).push(createMockItem('World', SentenceItemType.Word, true));

    const result = StructureEditor.deleteItem(data, 1, 1, 1);

    expect(itemsOf(result)).toHaveLength(1);
    expect(itemsOf(result)[0].linguisticItem.glueNext).toBe(true);
  });
});
