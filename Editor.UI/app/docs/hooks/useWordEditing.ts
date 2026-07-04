import { useCallback } from 'react';
import { useWordSelection } from './useWordSelection';
import { useUIStore } from '../uiStore';
import { WordEditingService } from '../wordEditingService';
import { ParadigmFormId, LinguisticTag, LinguisticErrorType } from '../types';

export function useWordEditing(documentId: string, wordEditingService: WordEditingService) {
  const { selectedWord } = useWordSelection();
  const {
    setIsSavingText,
    setIsSavingManual,
    setIsSavingComment,
    setIsSavingError,
  } = useUIStore();

  const handleSaveParadigm = useCallback(async (paradigmFormId: ParadigmFormId) => {
    if (!selectedWord || !documentId) return;

    try {
      await wordEditingService.saveParadigmFormId(documentId, selectedWord, paradigmFormId);
    } catch (error) {
      console.error('Памылка захаваньня парадыгмы:', error);
    }
  }, [selectedWord, documentId, wordEditingService]);

  const handleUpdateWordText = useCallback(async (text: string) => {
    if (!selectedWord || !documentId) return;

    setIsSavingText(true);
    try {
      await wordEditingService.updateWordText(documentId, selectedWord, text);
    } catch (error) {
      console.error('Памылка абнаўленьня тэксту:', error);
      throw error;
    } finally {
      setIsSavingText(false);
    }
  }, [selectedWord, documentId, wordEditingService, setIsSavingText]);

  const handleSaveManualCategories = useCallback(async (lemma: string, linguisticTag: LinguisticTag) => {
    if (!selectedWord || !documentId) return;

    setIsSavingManual(true);
    try {
      await wordEditingService.saveManualCategories(documentId, selectedWord, lemma, linguisticTag);
    } catch (error) {
      console.error('Памылка захаваньня катэгорый:', error);
      throw error;
    } finally {
      setIsSavingManual(false);
    }
  }, [selectedWord, documentId, wordEditingService, setIsSavingManual]);

  const handleSaveComment = useCallback(async (comment: string) => {
    if (!selectedWord || !documentId) return;

    setIsSavingComment(true);
    try {
      await wordEditingService.saveComment(documentId, selectedWord, comment);
    } catch (error) {
      console.error('Памылка захаваньня камэнтара:', error);
    } finally {
      setIsSavingComment(false);
    }
  }, [selectedWord, documentId, wordEditingService, setIsSavingComment]);

  const handleSaveErrorType = useCallback(async (errorType: LinguisticErrorType) => {
    if (!selectedWord || !documentId) return;

    setIsSavingError(true);
    try {
      await wordEditingService.saveErrorType(documentId, selectedWord, errorType);
    } catch (error) {
      console.error('Памылка захаваньня тыпу памылкі:', error);
    } finally {
      setIsSavingError(false);
    }
  }, [selectedWord, documentId, wordEditingService, setIsSavingError]);

  return {
    handleSaveParadigm,
    handleUpdateWordText,
    handleSaveManualCategories,
    handleSaveComment,
    handleSaveErrorType,
  };
}
