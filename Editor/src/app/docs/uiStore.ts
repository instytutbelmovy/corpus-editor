import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SelectedWord } from './types';

export type DisplayMode = 'full' | 'compact';

interface UIState {
  // Выбранае слова
  selectedWord: SelectedWord | null;

  // Налады адлюстраваньня
  displayMode: DisplayMode;

  // Стан рэдагаваньня
  isEditingText: boolean;
  isSavingText: boolean;
  isSavingManual: boolean;
  isSavingComment: boolean;
  isSavingError: boolean;
  showManualInput: boolean;

  // Памылкі
  saveError: string | null;

  // Чакаючыя захаваньні
  pendingSaves: Set<string>;

  // Дзеяньні для выбару слоў
  setSelectedWord: (word: SelectedWord | null) => void;
  clearSelectedWord: () => void;

  // Дзеяньні для налад
  setDisplayMode: (mode: 'full' | 'compact') => void;

  // Дзеяньні для рэдагаваньня
  setIsEditingText: (editing: boolean) => void;
  setIsSavingText: (saving: boolean) => void;
  setIsSavingManual: (saving: boolean) => void;
  setIsSavingComment: (saving: boolean) => void;
  setIsSavingError: (saving: boolean) => void;
  setShowManualInput: (show: boolean) => void;

  // Дзеяньні для памылак
  setSaveError: (error: string | null) => void;
  clearSaveError: () => void;

  // Дзеяньні для чакаючых захаваньняў
  addPendingSave: (key: string) => void;
  removePendingSave: (key: string) => void;
  clearPendingSaves: () => void;

  // Рэжым рэдагаваньня структуры
  isStructureEditingMode: boolean;
  setIsStructureEditingMode: (mode: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Пачатковы стан
      selectedWord: null,
      displayMode: 'compact',
      isEditingText: false,
      isSavingText: false,
      isSavingManual: false,
      isSavingComment: false,
      isSavingError: false,
      showManualInput: false,
      saveError: null,
      pendingSaves: new Set(),

      // Дзеяньні для выбару слоў
      setSelectedWord: (word) => set({ selectedWord: word }),
      clearSelectedWord: () => set({ selectedWord: null, isEditingText: false }),

      // Дзеяньні для налад
      setDisplayMode: (mode) => set({ displayMode: mode }),

      // Дзеяньні для рэдагаваньня
      setIsEditingText: (editing) => set({ isEditingText: editing }),
      setIsSavingText: (saving) => set({ isSavingText: saving }),
      setIsSavingManual: (saving) => set({ isSavingManual: saving }),
      setIsSavingComment: (saving) => set({ isSavingComment: saving }),
      setIsSavingError: (saving) => set({ isSavingError: saving }),
      setShowManualInput: (show) => set({ showManualInput: show }),

      // Дзеяньні для памылак
      setSaveError: (error) => set({ saveError: error }),
      clearSaveError: () => set({ saveError: null }),

      // Дзеяньні для чакаючых захаваньняў
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

      // Рэжым рэдагаваньня структуры
      isStructureEditingMode: false,
      setIsStructureEditingMode: (mode) => set({ isStructureEditingMode: mode }),
    }),
    {
      name: 'editor-ui-store',
      partialize: (state) => ({ displayMode: state.displayMode }),
    }
  )
);
