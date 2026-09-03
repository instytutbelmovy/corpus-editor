import { useDocumentStore } from '../store';
import { useUIStore } from '../uiStore';
import { selectWord } from '../wordEditing';

// Дадае элемэнт і адразу ставіць курсор у яго для ўводу тэксту
export function useAddItem() {
  const addWord = useDocumentStore(state => state.addWord);
  const addPunctuation = useDocumentStore(state => state.addPunctuation);
  const setIsStructureTextEditing = useUIStore(
    state => state.setIsStructureTextEditing
  );

  const addAndSelect = (
    add: (paragraphId: number, sentenceId: number, index: number) => void,
    paragraphId: number,
    sentenceId: number,
    index: number
  ) => {
    add(paragraphId, sentenceId, index);
    if (selectWord(paragraphId, sentenceId, index + 1)) {
      setIsStructureTextEditing(true);
    }
  };

  return {
    handleAddWord: (paragraphId: number, sentenceId: number, index: number) =>
      addAndSelect(addWord, paragraphId, sentenceId, index),
    handleAddPunctuation: (
      paragraphId: number,
      sentenceId: number,
      index: number
    ) => addAndSelect(addPunctuation, paragraphId, sentenceId, index),
  };
}
