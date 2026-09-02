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

  // Вяртае, ці было слова сапраўды знойдзена і выбрана
  const selectWord = useCallback(
    (paragraphId: number, sentenceId: number, wordIndex: number): boolean => {
      const { documentData } = useDocumentStore.getState();
      const paragraph = documentData?.paragraphs.find(
        p => p.id === paragraphId
      );
      const sentence = paragraph?.sentences.find(s => s.id === sentenceId);
      if (!paragraph || !sentence || !sentence.sentenceItems[wordIndex])
        return false;

      useUIStore
        .getState()
        .setSelectedWord(toSelectedWord(paragraph, sentence, wordIndex));
      return true;
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
