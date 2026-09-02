import { useCallback } from 'react';
import { useUIStore } from '../uiStore';
import { useDocumentStore } from '../store';
import { toSelectedWord } from '../wordEditing';

export function useWordSelection() {
  const {
    selectedWord,
    clearSelectedWord,
    saveError,
    clearSaveError,
    pendingSaves,
  } = useUIStore();

  const selectWord = useCallback(
    (paragraphId: number, sentenceId: number, wordIndex: number) => {
      const { documentData } = useDocumentStore.getState();
      const paragraph = documentData?.paragraphs.find(
        p => p.id === paragraphId
      );
      const sentence = paragraph?.sentences.find(s => s.id === sentenceId);
      if (!paragraph || !sentence || !sentence.sentenceItems[wordIndex]) return;

      useUIStore
        .getState()
        .setSelectedWord(toSelectedWord(paragraph, sentence, wordIndex));
    },
    []
  );

  return {
    selectedWord,
    selectWord,
    clearSelectedWord,
    saveError,
    clearSaveError,
    pendingSaves,
  };
}
