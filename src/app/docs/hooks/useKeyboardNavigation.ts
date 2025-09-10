import { useEffect } from 'react';
import { useUIStore } from '../uiStore';

export function useKeyboardNavigation() {
  const { selectedWord, clearSelectedWord } = useUIStore();

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
