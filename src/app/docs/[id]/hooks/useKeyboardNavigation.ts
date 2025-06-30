import { useEffect } from 'react';
import { SelectedWord } from '@/types/document';

export function useKeyboardNavigation(
  selectedWord: SelectedWord | null,
  onClose: () => void
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedWord) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedWord, onClose]);
}
