import { StructureEditor } from '../app/docs/structureEditor';
import { DocumentData, Paragraph, Sentence, SentenceItemType } from '../app/docs/types';

const createMockSentence = (id: number, text: string): Sentence => ({
  id,
  concurrencyStamp: 'sentence-stamp',
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
});

const createMockParagraph = (id: number, sentences: Sentence[]): Paragraph => ({
  id,
  concurrencyStamp: 'paragraph-stamp',
  sentences,
});

const createMockData = (): DocumentData => ({
  header: {} as any,
  paragraphs: [
    createMockParagraph(1, [createMockSentence(1, 'Hello')]),
    createMockParagraph(2, [createMockSentence(1, 'World')]),
  ],
});

describe('StructureEditor', () => {
  it('should add a word', () => {
    const data = createMockData();
    const result = StructureEditor.addWord(data, 1, 1, 0);

    expect(result.newDocumentData.paragraphs[0].sentences[0].sentenceItems).toHaveLength(2);
    expect(result.newOperations).toHaveLength(1);
    expect(result.newOperations[0].operationType).toBe(1); // Update
  });

  it('should split a sentence', () => {
    const data = createMockData();
    // Add a word to the first sentence so we can split
    data.paragraphs[0].sentences[0].sentenceItems.push({
      linguisticItem: { text: 'World', type: 1 } as any,
      options: [],
    });

    const result = StructureEditor.splitSentence(data, 1, 1, 0);

    expect(result.newDocumentData.paragraphs[0].sentences).toHaveLength(2);
    expect(result.newDocumentData.paragraphs[0].sentences[0].sentenceItems).toHaveLength(1);
    expect(result.newDocumentData.paragraphs[0].sentences[1].sentenceItems).toHaveLength(1);
    expect(result.newOperations).toHaveLength(1);
  });

  it('should join sentences', () => {
    const data = createMockData();
    // Add a second sentence to the first paragraph
    data.paragraphs[0].sentences.push(createMockSentence(2, 'World'));

    const result = StructureEditor.joinSentence(data, 1, 1);

    expect(result.newDocumentData.paragraphs[0].sentences).toHaveLength(1);
    expect(result.newDocumentData.paragraphs[0].sentences[0].sentenceItems).toHaveLength(2);
    expect(result.newOperations).toHaveLength(1);
  });

  it('should split a paragraph', () => {
    const data = createMockData();
    // Add a second sentence to the first paragraph
    data.paragraphs[0].sentences.push(createMockSentence(2, 'World'));

    const result = StructureEditor.splitParagraph(data, 1, 2);

    expect(result.newDocumentData.paragraphs).toHaveLength(3); // 1, 2, 3 (original 2 becomes 3)
    expect(result.newDocumentData.paragraphs[0].sentences).toHaveLength(1);
    expect(result.newDocumentData.paragraphs[1].sentences).toHaveLength(1);
    expect(result.newDocumentData.paragraphs[2].id).toBe(3);
    expect(result.newOperations).toHaveLength(2); // Update + Create
  });

  it('should join paragraphs', () => {
    const data = createMockData();

    const result = StructureEditor.joinParagraph(data, 1);

    expect(result.newDocumentData.paragraphs).toHaveLength(1);
    expect(result.newDocumentData.paragraphs[0].sentences).toHaveLength(2);
    expect(result.newOperations).toHaveLength(2); // Update + Delete
  });

  it('should delete an item and remove sentence if empty', () => {
    const data = createMockData();
    const result = StructureEditor.deleteItem(data, 1, 1, 0);

    expect(result.newDocumentData.paragraphs).toHaveLength(1); // Original 2 becomes 1
    expect(result.newDocumentData.paragraphs[0].sentences).toHaveLength(1); // The remaining paragraph has 1 sentence
    expect(result.newDocumentData.paragraphs[0].id).toBe(1); // Shifted
    expect(result.newOperations[0].operationType).toBe(-1); // Delete
  });
});
