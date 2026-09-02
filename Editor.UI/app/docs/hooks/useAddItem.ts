import { useDocumentStore } from '../store';
import { useWordSelection } from './useWordSelection';
import { useUIStore } from '../uiStore';

// Дадае элемэнт і адразу ставіць курсор у яго для ўводу тэксту
export function useAddItem() {
  const { addWord, addPunctuation } = useDocumentStore();
  const { selectWord } = useWordSelection();
  const { setIsStructureTextEditing } = useUIStore();

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
