import { create } from 'zustand';
import { SelectedWord } from './types';

export type DisplayMode = 'full' | 'compact';

interface UIState {
  // Выбранае слова
  selectedWord: SelectedWord | null;
  
  // Налады адлюстравання
  displayMode: DisplayMode;
  
  // Стан рэдагавання
  isEditingText: boolean;
  isSavingText: boolean;
  isSavingManual: boolean;
  isSavingComment: boolean;
  showManualInput: boolean;
  
  // Памылкі
  saveError: string | null;
  
  // Чакаючыя захаванні
  pendingSaves: Set<string>;
  
  // Дзеянні для выбару слоў
  setSelectedWord: (word: SelectedWord | null) => void;
  clearSelectedWord: () => void;
  
  // Дзеянні для налад
  setDisplayMode: (mode: 'full' | 'compact') => void;
  
  // Дзеянні для рэдагавання
  setIsEditingText: (editing: boolean) => void;
  setIsSavingText: (saving: boolean) => void;
  setIsSavingManual: (saving: boolean) => void;
  setIsSavingComment: (saving: boolean) => void;
  setShowManualInput: (show: boolean) => void;
  
  // Дзеянні для памылак
  setSaveError: (error: string | null) => void;
  clearSaveError: () => void;
  
  // Дзеянні для чакаючых захаванняў
  addPendingSave: (key: string) => void;
  removePendingSave: (key: string) => void;
  clearPendingSaves: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Пачатковы стан
  selectedWord: null,
  displayMode: 'full',
  isEditingText: false,
  isSavingText: false,
  isSavingManual: false,
  isSavingComment: false,
  showManualInput: false,
  saveError: null,
  pendingSaves: new Set(),

  // Дзеянні для выбару слоў
  setSelectedWord: (word) => set({ selectedWord: word }),
  clearSelectedWord: () => set({ selectedWord: null }),

  // Дзеянні для налад
  setDisplayMode: (mode) => set({ displayMode: mode }),

  // Дзеянні для рэдагавання
  setIsEditingText: (editing) => set({ isEditingText: editing }),
  setIsSavingText: (saving) => set({ isSavingText: saving }),
  setIsSavingManual: (saving) => set({ isSavingManual: saving }),
  setIsSavingComment: (saving) => set({ isSavingComment: saving }),
  setShowManualInput: (show) => set({ showManualInput: show }),

  // Дзеянні для памылак
  setSaveError: (error) => set({ saveError: error }),
  clearSaveError: () => set({ saveError: null }),

  // Дзеянні для чакаючых захаванняў
  addPendingSave: (key) => {
    set(state => ({
      pendingSaves: new Set([...state.pendingSaves, key])
    }));
  },
  
  removePendingSave: (key) => {
    set(state => {
      const newSet = new Set(state.pendingSaves);
      newSet.delete(key);
      return { pendingSaves: newSet };
    });
  },
  
  clearPendingSaves: () => set({ pendingSaves: new Set() }),
}));
