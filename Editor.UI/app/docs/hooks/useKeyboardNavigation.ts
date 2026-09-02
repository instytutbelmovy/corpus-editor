import { useEffect } from 'react';
import { useUIStore } from '../uiStore';

export function useKeyboardNavigation() {
  const selectedWord = useUIStore(state => state.selectedWord);
  const clearSelectedWord = useUIStore(state => state.clearSelectedWord);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedWord) {
        clearSelectedWord();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedWord, clearSelectedWord]);
}
