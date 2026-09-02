import { useCallback } from 'react';
import { useUIStore } from '../uiStore';
import * as wordEditing from '../wordEditing';
import { LinguisticErrorType, LinguisticTag, ParadigmFormId } from '../types';

// Абгортка над wordEditing: бярэ выбранае слова са store і трымае флагі захаваньня
export function useWordEditing(documentId: string) {
  const {
    selectedWord,
    setIsSavingText,
    setIsSavingManual,
    setIsSavingComment,
    setIsSavingError,
  } = useUIStore();

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

  const handleSaveComment = useCallback(
    async (comment: string) => {
      if (!selectedWord || !documentId) return;

      setIsSavingComment(true);
      try {
        await wordEditing.saveComment(documentId, selectedWord, comment);
      } finally {
        setIsSavingComment(false);
      }
    },
    [selectedWord, documentId, setIsSavingComment]
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
