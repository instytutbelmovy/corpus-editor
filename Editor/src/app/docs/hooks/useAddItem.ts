import { useDocumentStore } from '../store';
import { useWordSelection } from './useWordSelection';
import { useUIStore } from '../uiStore';

export function useAddItem() {
  const { addWord, addPunctuation } = useDocumentStore();
  const { selectWord } = useWordSelection();
  const { setIsEditingText } = useUIStore();

  const handleAddWord = (paragraphId: number, sentenceId: number, index: number) => {
    addWord(paragraphId, sentenceId, index);
    selectNewItem(paragraphId, sentenceId, index + 1);
  };

  const handleAddPunctuation = (paragraphId: number, sentenceId: number, index: number) => {
    addPunctuation(paragraphId, sentenceId, index);
    selectNewItem(paragraphId, sentenceId, index + 1);
  };

  const selectNewItem = (paragraphId: number, sentenceId: number, newIndex: number) => {
    const { documentData } = useDocumentStore.getState();
    if (documentData) {
      const paragraph = documentData.paragraphs.find(p => p.id === paragraphId);
      const sentence = paragraph?.sentences.find(s => s.id === sentenceId);
      const newItem = sentence?.sentenceItems[newIndex]?.linguisticItem;
      if (newItem) {
        selectWord(newItem, paragraphId, sentenceId, newIndex);
        setIsEditingText(true);
      }
    }
  };

  return {
    handleAddWord,
    handleAddPunctuation
  };
}
