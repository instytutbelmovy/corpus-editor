import { useCallback } from 'react';
import { useUIStore } from '../uiStore';
import * as wordEditing from '../wordEditing';
import { LinguisticErrorType, LinguisticTag, ParadigmFormId } from '../types';

// Абгортка над wordEditing: бярэ выбранае слова са store і трымае флагі захаваньня
export function useWordEditing(documentId: string) {
  const selectedWord = useUIStore(state => state.selectedWord);
  const setIsSavingText = useUIStore(state => state.setIsSavingText);
  const setIsSavingManual = useUIStore(state => state.setIsSavingManual);
  const setIsSavingError = useUIStore(state => state.setIsSavingError);

  const handleSaveParadigm = useCallback(
    async (paradigmFormId: ParadigmFormId) => {
      if (!selectedWord || !documentId) return;
      try {
        await wordEditing.saveParadigmFormId(
          documentId,
          selectedWord,
          paradigmFormId
        );
      } catch (error) {
        console.error('Памылка захаваньня парадыгмы:', error);
      }
    },
    [selectedWord, documentId]
  );

  const handleUpdateWordText = useCallback(
    async (text: string) => {
      if (!selectedWord || !documentId) return;

      setIsSavingText(true);
      try {
        await wordEditing.updateWordText(documentId, selectedWord, text);
      } finally {
        setIsSavingText(false);
      }
    },
    [selectedWord, documentId, setIsSavingText]
  );

  const handleSaveManualCategories = useCallback(
    async (lemma: string, linguisticTag: LinguisticTag) => {
      if (!selectedWord || !documentId) return;

      setIsSavingManual(true);
      try {
        await wordEditing.saveManualCategories(
          documentId,
          selectedWord,
          lemma,
          linguisticTag
        );
      } finally {
        setIsSavingManual(false);
      }
    },
    [selectedWord, documentId, setIsSavingManual]
  );

  // Стан захаваньня камэнтара трымае не гэты хук, а useDebouncedSave (флаг па слове)
  const handleSaveComment = useCallback(
    async (comment: string) => {
      if (!selectedWord || !documentId) return;
      await wordEditing.saveComment(documentId, selectedWord, comment);
    },
    [selectedWord, documentId]
  );

  const handleSaveErrorType = useCallback(
    async (errorType: LinguisticErrorType) => {
      if (!selectedWord || !documentId) return;

      setIsSavingError(true);
      try {
        await wordEditing.saveErrorType(documentId, selectedWord, errorType);
      } finally {
        setIsSavingError(false);
      }
    },
    [selectedWord, documentId, setIsSavingError]
  );

  return {
    handleSaveParadigm,
    handleUpdateWordText,
    handleSaveManualCategories,
    handleSaveComment,
    handleSaveErrorType,
  };
}
