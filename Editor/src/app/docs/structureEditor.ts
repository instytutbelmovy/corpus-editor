import {
  DocumentData,
  Paragraph,
  Sentence,
  LinguisticItem,
  SentenceItem,
  ParagraphOperation,
  OperationType,
  SentenceItemType,
} from './types';

export interface EditResult {
  newDocumentData: DocumentData;
  newOperations: ParagraphOperation[];
}

// Helper to clone deep to avoid mutating state directly
const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const StructureEditor = {
  addWord: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    wordIndex: number
  ): EditResult => {
    const newData = clone(data);
    const paragraph = newData.paragraphs.find((p) => p.id === paragraphId);
    if (!paragraph) throw new Error('Paragraph not found');
    const sentence = paragraph.sentences.find((s) => s.id === sentenceId);
    if (!sentence) throw new Error('Sentence not found');

    const newWord: SentenceItem = {
      linguisticItem: {
        text: '',
        type: SentenceItemType.Word,
        lemma: null,
        linguisticTag: null,
        paradigmFormId: null,
        comment: '',
        metadata: null,
        glueNext: false,
      },
      options: [],
    };

    // Glue Logic for Add Word:
    // "If adding a word into this pair where left element has glueNext, then that left element must get glueNext: false, and added word - glueNext: true"
    const leftItem = sentence.sentenceItems[wordIndex];
    if (leftItem && leftItem.linguisticItem.glueNext) {
      leftItem.linguisticItem.glueNext = false;
      newWord.linguisticItem.glueNext = true;
    }

    // Insert after the specified index
    sentence.sentenceItems.splice(wordIndex + 1, 0, newWord);

    return {
      newDocumentData: newData,
      newOperations: [
        {
          paragraphId: paragraphId,
          operationType: OperationType.Update,
          replacementSentences: paragraph.sentences.map((s) =>
            s.sentenceItems.map((si) => si.linguisticItem)
          ),
          concurrencyStamp: paragraph.concurrencyStamp,
        },
      ],
    };
  },

  addPunctuation: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    wordIndex: number
  ): EditResult => {
    const newData = clone(data);
    const paragraph = newData.paragraphs.find((p) => p.id === paragraphId);
    if (!paragraph) throw new Error('Paragraph not found');
    const sentence = paragraph.sentences.find((s) => s.id === sentenceId);
    if (!sentence) throw new Error('Sentence not found');

    const newPunctuation: SentenceItem = {
      linguisticItem: {
        text: '',
        type: SentenceItemType.Punctuation,
        lemma: null,
        linguisticTag: null,
        paradigmFormId: null,
        comment: '',
        metadata: null,
        glueNext: false,
      },
      options: [],
    };

    // Glue Logic for Add Punctuation:
    // "If adding punctuation it receives glueNext same as left element."
    const leftItem = sentence.sentenceItems[wordIndex];
    if (leftItem) {
      newPunctuation.linguisticItem.glueNext = leftItem.linguisticItem.glueNext;
    }

    // Insert after the specified index
    sentence.sentenceItems.splice(wordIndex + 1, 0, newPunctuation);

    return {
      newDocumentData: newData,
      newOperations: [
        {
          paragraphId: paragraphId,
          operationType: OperationType.Update,
          replacementSentences: paragraph.sentences.map((s) =>
            s.sentenceItems.map((si) => si.linguisticItem)
          ),
          concurrencyStamp: paragraph.concurrencyStamp,
        },
      ],
    };
  },

  addLineBreak: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    wordIndex: number
  ): EditResult => {
    const newData = clone(data);
    const paragraph = newData.paragraphs.find((p) => p.id === paragraphId);
    if (!paragraph) throw new Error('Paragraph not found');
    const sentence = paragraph.sentences.find((s) => s.id === sentenceId);
    if (!sentence) throw new Error('Sentence not found');

    const newLineBreak: SentenceItem = {
      linguisticItem: {
        text: '\n',
        type: SentenceItemType.LineBreak,
        lemma: null,
        linguisticTag: null,
        paradigmFormId: null,
        comment: '',
        metadata: null,
        glueNext: false,
      },
      options: [],
    };

    // Glue Logic for Add LineBreak:
    // Inherit glueNext from left item like punctuation
    const leftItem = sentence.sentenceItems[wordIndex];
    if (leftItem) {
      newLineBreak.linguisticItem.glueNext = leftItem.linguisticItem.glueNext;
    }

    // Insert after the specified index
    sentence.sentenceItems.splice(wordIndex + 1, 0, newLineBreak);

    return {
      newDocumentData: newData,
      newOperations: [
        {
          paragraphId: paragraphId,
          operationType: OperationType.Update,
          replacementSentences: paragraph.sentences.map((s) =>
            s.sentenceItems.map((si) => si.linguisticItem)
          ),
          concurrencyStamp: paragraph.concurrencyStamp,
        },
      ],
    };
  },

  deleteItem: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    itemIndex: number
  ): EditResult => {
    const newData = clone(data);
    const paragraphIndex = newData.paragraphs.findIndex((p) => p.id === paragraphId);
    if (paragraphIndex === -1) throw new Error('Paragraph not found');
    const paragraph = newData.paragraphs[paragraphIndex];

    const sentenceIndex = paragraph.sentences.findIndex((s) => s.id === sentenceId);
    if (sentenceIndex === -1) throw new Error('Sentence not found');
    const sentence = paragraph.sentences[sentenceIndex];

    // Glue Logic for Delete Item:
    // "If deleting a word that has glueNext, then if it wasn't the first word in the sentence, the element to the left must get glueNext: true"
    // "If deleting punctuation, its glueNext influences nothing"
    const itemToDelete = sentence.sentenceItems[itemIndex];
    const leftItem = sentence.sentenceItems[itemIndex - 1];

    if (itemToDelete.linguisticItem.type === SentenceItemType.Word && itemToDelete.linguisticItem.glueNext) {
      if (leftItem) {
        leftItem.linguisticItem.glueNext = true;
      }
    }

    // Remove item
    sentence.sentenceItems.splice(itemIndex, 1);

    // Check if sentence is empty
    if (sentence.sentenceItems.length === 0) {
      paragraph.sentences.splice(sentenceIndex, 1);
    }

    // Check if paragraph is empty
    if (paragraph.sentences.length === 0) {
      newData.paragraphs.splice(paragraphIndex, 1);
      // Shift subsequent paragraph IDs
      for (let i = paragraphIndex; i < newData.paragraphs.length; i++) {
        newData.paragraphs[i].id -= 1;
      }

      return {
        newDocumentData: newData,
        newOperations: [
          {
            paragraphId: paragraphId,
            operationType: OperationType.Delete,
            replacementSentences: null,
            concurrencyStamp: paragraph.concurrencyStamp,
          },
        ],
      };
    }

    return {
      newDocumentData: newData,
      newOperations: [
        {
          paragraphId: paragraphId,
          operationType: OperationType.Update,
          replacementSentences: paragraph.sentences.map((s) =>
            s.sentenceItems.map((si) => si.linguisticItem)
          ),
          concurrencyStamp: paragraph.concurrencyStamp,
        },
      ],
    };
  },

  splitSentence: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    splitIndex: number // Index of the item *after* which to split (i.e., last item of first sentence)
  ): EditResult => {
    const newData = clone(data);
    const paragraph = newData.paragraphs.find((p) => p.id === paragraphId);
    if (!paragraph) throw new Error('Paragraph not found');
    const sentenceIndex = paragraph.sentences.findIndex((s) => s.id === sentenceId);
    if (sentenceIndex === -1) throw new Error('Sentence not found');
    const sentence = paragraph.sentences[sentenceIndex];

    const firstPartItems = sentence.sentenceItems.slice(0, splitIndex + 1);
    const secondPartItems = sentence.sentenceItems.slice(splitIndex + 1);

    if (secondPartItems.length === 0) return { newDocumentData: data, newOperations: [] };

    // Update first sentence
    sentence.sentenceItems = firstPartItems;

    // Create second sentence
    // Note: We don't have real IDs for new sentences, but we can assign temporary ones or rely on backend to reassign.
    // For local state, we need unique IDs. Let's assume we can just increment max ID or use a temp one.
    // However, the backend expects us to send the full list of sentences for the paragraph update.
    // The backend will regenerate IDs.
    // For local UI consistency, let's generate a temporary ID.
    const maxSentenceId = Math.max(...paragraph.sentences.map((s) => s.id), 0);
    const newSentence: Sentence = {
      id: maxSentenceId + 1,
      concurrencyStamp: crypto.randomUUID(), // Temporary stamp
      sentenceItems: secondPartItems,
    };

    paragraph.sentences.splice(sentenceIndex + 1, 0, newSentence);

    return {
      newDocumentData: newData,
      newOperations: [
        {
          paragraphId: paragraphId,
          operationType: OperationType.Update,
          replacementSentences: paragraph.sentences.map((s) =>
            s.sentenceItems.map((si) => si.linguisticItem)
          ),
          concurrencyStamp: paragraph.concurrencyStamp,
        },
      ],
    };
  },

  joinSentence: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number // The first sentence to join with the next one
  ): EditResult => {
    const newData = clone(data);
    const paragraph = newData.paragraphs.find((p) => p.id === paragraphId);
    if (!paragraph) throw new Error('Paragraph not found');
    const sentenceIndex = paragraph.sentences.findIndex((s) => s.id === sentenceId);
    if (sentenceIndex === -1) throw new Error('Sentence not found');

    if (sentenceIndex >= paragraph.sentences.length - 1) return { newDocumentData: data, newOperations: [] };

    const firstSentence = paragraph.sentences[sentenceIndex];
    const secondSentence = paragraph.sentences[sentenceIndex + 1];

    // Merge items
    firstSentence.sentenceItems = [...firstSentence.sentenceItems, ...secondSentence.sentenceItems];

    // Remove second sentence
    paragraph.sentences.splice(sentenceIndex + 1, 1);

    return {
      newDocumentData: newData,
      newOperations: [
        {
          paragraphId: paragraphId,
          operationType: OperationType.Update,
          replacementSentences: paragraph.sentences.map((s) =>
            s.sentenceItems.map((si) => si.linguisticItem)
          ),
          concurrencyStamp: paragraph.concurrencyStamp,
        },
      ],
    };
  },

  splitParagraph: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number // The first sentence of the NEW paragraph
  ): EditResult => {
    const newData = clone(data);
    const paragraphIndex = newData.paragraphs.findIndex((p) => p.id === paragraphId);
    if (paragraphIndex === -1) throw new Error('Paragraph not found');
    const paragraph = newData.paragraphs[paragraphIndex];

    const sentenceIndex = paragraph.sentences.findIndex((s) => s.id === sentenceId);
    if (sentenceIndex === -1) throw new Error('Sentence not found');

    if (sentenceIndex === 0) return { newDocumentData: data, newOperations: [] }; // Nothing to split if it's the first sentence

    const firstParagraphSentences = paragraph.sentences.slice(0, sentenceIndex);
    const secondParagraphSentences = paragraph.sentences.slice(sentenceIndex);

    // Update first paragraph
    paragraph.sentences = firstParagraphSentences;

    // Create second paragraph
    const newParagraphId = paragraphId + 1;
    const newParagraph: Paragraph = {
      id: newParagraphId,
      concurrencyStamp: crypto.randomUUID(), // Temporary
      sentences: secondParagraphSentences,
    };

    // Insert new paragraph
    newData.paragraphs.splice(paragraphIndex + 1, 0, newParagraph);

    // Shift subsequent IDs
    for (let i = paragraphIndex + 2; i < newData.paragraphs.length; i++) {
      newData.paragraphs[i].id += 1;
    }

    return {
      newDocumentData: newData,
      newOperations: [
        // Update original paragraph (remove sentences)
        {
          paragraphId: paragraphId,
          operationType: OperationType.Update,
          replacementSentences: firstParagraphSentences.map((s) =>
            s.sentenceItems.map((si) => si.linguisticItem)
          ),
          concurrencyStamp: paragraph.concurrencyStamp,
        },
        // Create new paragraph
        {
          paragraphId: newParagraphId,
          operationType: OperationType.Create,
          replacementSentences: secondParagraphSentences.map((s) =>
            s.sentenceItems.map((si) => si.linguisticItem)
          ),
        },
      ],
    };
  },

  joinParagraph: (
    data: DocumentData,
    paragraphId: number // The first paragraph to join with the next one
  ): EditResult => {
    const newData = clone(data);
    const paragraphIndex = newData.paragraphs.findIndex((p) => p.id === paragraphId);
    if (paragraphIndex === -1) throw new Error('Paragraph not found');

    if (paragraphIndex >= newData.paragraphs.length - 1) return { newDocumentData: data, newOperations: [] };

    const firstParagraph = newData.paragraphs[paragraphIndex];
    const secondParagraph = newData.paragraphs[paragraphIndex + 1];

    // Merge sentences
    // We need to ensure sentence IDs are unique/consistent if we care about them locally, 
    // but for the operation we just send the list.
    // Let's re-id the sentences of the second paragraph to avoid collisions if any (though they should be unique per paragraph usually)
    const maxFirstId = Math.max(...firstParagraph.sentences.map(s => s.id), 0);
    const shiftedSecondSentences = secondParagraph.sentences.map((s, idx) => ({
      ...s,
      id: maxFirstId + 1 + idx
    }));

    firstParagraph.sentences = [...firstParagraph.sentences, ...shiftedSecondSentences];

    // Remove second paragraph
    newData.paragraphs.splice(paragraphIndex + 1, 1);

    // Shift subsequent IDs
    for (let i = paragraphIndex + 1; i < newData.paragraphs.length; i++) {
      newData.paragraphs[i].id -= 1;
    }

    return {
      newDocumentData: newData,
      newOperations: [
        // Update first paragraph (add sentences)
        {
          paragraphId: paragraphId,
          operationType: OperationType.Update,
          replacementSentences: firstParagraph.sentences.map((s) =>
            s.sentenceItems.map((si) => si.linguisticItem)
          ),
          concurrencyStamp: firstParagraph.concurrencyStamp,
        },
        // Delete second paragraph
        {
          paragraphId: paragraphId + 1, // It was the next one
          operationType: OperationType.Delete,
          replacementSentences: null,
          // Concurrency stamp is needed for delete? 
          // The backend says: "if (paragraphOperation.OperationType is OperationType.Update or OperationType.Delete) ... check concurrency stamp"
          // But wait, the backend logic for Delete says:
          // "if (ongoingParagraphsCount < paragraphOperation.ParagraphId) throw NotFound"
          // "if (document.Paragraphs[paragraphIndex].ConcurrencyStamp != paragraphOperation.ConcurrencyStamp) throw Conflict"
          // So yes, we need the stamp of the paragraph being deleted.
          concurrencyStamp: secondParagraph.concurrencyStamp,
        },
      ],
    };
  },

  setGlue: (
    data: DocumentData,
    paragraphId: number,
    sentenceId: number,
    itemIndex: number,
    glueNext: boolean
  ): EditResult => {
    const newData = clone(data);
    const paragraph = newData.paragraphs.find((p) => p.id === paragraphId);
    if (!paragraph) throw new Error('Paragraph not found');
    const sentence = paragraph.sentences.find((s) => s.id === sentenceId);
    if (!sentence) throw new Error('Sentence not found');
    const item = sentence.sentenceItems[itemIndex];
    if (!item) throw new Error('Item not found');

    item.linguisticItem.glueNext = glueNext;

    return {
      newDocumentData: newData,
      newOperations: [
        {
          paragraphId: paragraphId,
          operationType: OperationType.Update,
          replacementSentences: paragraph.sentences.map((s) =>
            s.sentenceItems.map((si) => si.linguisticItem)
          ),
          concurrencyStamp: paragraph.concurrencyStamp,
        },
      ],
    };
  },
};
