import { useUIStore } from '../uiStore';
import { selectWord } from '../wordEditing';

export function useWordSelection() {
  const selectedWord = useUIStore(state => state.selectedWord);
  const clearSelectedWord = useUIStore(state => state.clearSelectedWord);
  const saveError = useUIStore(state => state.saveError);
  const clearSaveError = useUIStore(state => state.clearSaveError);

  return {
    selectedWord,
    // Не падпісваемся на стор дзеля выбару: гэта простая функцыя з wordEditing
    selectWord,
    clearSelectedWord,
    saveError,
    clearSaveError,
  };
}
