import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SelectedWord } from './types';

export type DisplayMode = 'full' | 'compact';

interface UIState {
  // Выбранае слова
  selectedWord: SelectedWord | null;

  // Налады адлюстраваньня (захоўваюцца ў localStorage)
  displayMode: DisplayMode;

  // Ці ідзе праўка тэксту слова проста ў тэксьце (рэжым рэдагаваньня структуры)
  isStructureTextEditing: boolean;

  // Флагі захаваньня палёў панэлі рэдагаваньня
  isSavingText: boolean;
  isSavingManual: boolean;
  isSavingComment: boolean;
  isSavingError: boolean;

  // Памылка захаваньня разьметкі
  saveError: string | null;

  // Словы, чые правкі яшчэ ляцяць на сэрвэр (ключ wordKey)
  pendingSaves: Set<string>;

  setSelectedWord: (word: SelectedWord | null) => void;
  clearSelectedWord: () => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setIsStructureTextEditing: (editing: boolean) => void;
  setIsSavingText: (saving: boolean) => void;
  setIsSavingManual: (saving: boolean) => void;
  setIsSavingComment: (saving: boolean) => void;
  setIsSavingError: (saving: boolean) => void;
  setSaveError: (error: string | null) => void;
  clearSaveError: () => void;
  addPendingSave: (key: string) => void;
  removePendingSave: (key: string) => void;

  // Рэжым рэдагаваньня структуры
  isStructureEditingMode: boolean;
  setIsStructureEditingMode: (mode: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      selectedWord: null,
      displayMode: 'compact',
      isStructureTextEditing: false,
      isSavingText: false,
      isSavingManual: false,
      isSavingComment: false,
      isSavingError: false,
      saveError: null,
      pendingSaves: new Set(),
      isStructureEditingMode: false,

      setSelectedWord: word => set({ selectedWord: word }),
      clearSelectedWord: () =>
        set({ selectedWord: null, isStructureTextEditing: false }),

      setDisplayMode: mode => set({ displayMode: mode }),

      setIsStructureTextEditing: editing =>
        set({ isStructureTextEditing: editing }),
      setIsSavingText: saving => set({ isSavingText: saving }),
      setIsSavingManual: saving => set({ isSavingManual: saving }),
      setIsSavingComment: saving => set({ isSavingComment: saving }),
      setIsSavingError: saving => set({ isSavingError: saving }),

      setSaveError: error => set({ saveError: error }),
      clearSaveError: () => set({ saveError: null }),

      addPendingSave: key =>
        set(state => ({ pendingSaves: new Set(state.pendingSaves).add(key) })),

      removePendingSave: key =>
        set(state => {
          const pendingSaves = new Set(state.pendingSaves);
          pendingSaves.delete(key);
          return { pendingSaves };
        }),

      setIsStructureEditingMode: mode => set({ isStructureEditingMode: mode }),
    }),
    {
      name: 'editor-ui-store',
      partialize: state => ({ displayMode: state.displayMode }),
    }
  )
);
