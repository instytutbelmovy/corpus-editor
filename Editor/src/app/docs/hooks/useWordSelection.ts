import { useUIStore } from '../uiStore';
import { useDocumentStore } from '../store';
import { LinguisticItem, SelectedWord } from '../types';

export function useWordSelection() {
  const {
    selectedWord,
    setSelectedWord,
    clearSelectedWord,
    saveError,
    setSaveError,
    clearSaveError,
    pendingSaves
  } = useUIStore();



  const selectWord = (item: LinguisticItem, paragraphId: number, sentenceId: number, wordIndex: number) => {
    const { documentData } = useDocumentStore.getState();
    if (!documentData) return;

    // Знаходзім параграф і сказ
    const paragraph = documentData.paragraphs.find(p => p.id === paragraphId);
    if (!paragraph) return;

    const sentence = paragraph.sentences.find(s => s.id === sentenceId);
    if (!sentence) return;

    const sentenceItem = sentence.sentenceItems[wordIndex];
    if (!sentenceItem) return;

    const newSelectedWord: SelectedWord = {
      paragraphId,
      paragraphStamp: paragraph.concurrencyStamp,
      sentenceId,
      sentenceStamp: sentence.concurrencyStamp,
      wordIndex,
      item,
      options: sentenceItem.options,
    };

    setSelectedWord(newSelectedWord);
  };

  return {
    selectedWord,
    selectWord,
    clearSelectedWord,
    saveError,
    setSaveError,
    clearSaveError,
    pendingSaves,
  };
}
