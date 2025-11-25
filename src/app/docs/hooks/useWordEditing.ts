import { useCallback } from 'react';
import { useWordSelection } from './useWordSelection';
import { useUIStore } from '../uiStore';
import { WordEditingService } from '../wordEditingService';
import { ParadigmFormId, LinguisticTag } from '../types';

export function useWordEditing(documentId: string, wordEditingService: WordEditingService) {
  const { selectedWord } = useWordSelection();
  const {
    setIsSavingText,
    setIsSavingManual,
    setIsSavingComment
  } = useUIStore();

  const handleSaveParadigm = useCallback(async (paradigmFormId: ParadigmFormId) => {
    if (!selectedWord || !documentId) return;

    try {
      await wordEditingService.saveParadigmFormId(documentId, selectedWord, paradigmFormId);
    } catch (error) {
      console.error('Памылка захавання парадыгмы:', error);
    }
  }, [selectedWord, documentId, wordEditingService]);

  const handleUpdateWordText = useCallback(async (text: string) => {
    if (!selectedWord || !documentId) return;

    setIsSavingText(true);
    try {
      await wordEditingService.updateWordText(documentId, selectedWord, text);
    } catch (error) {
      console.error('Памылка абнаўлення тэксту:', error);
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
      console.error('Памылка захавання катэгорый:', error);
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
      console.error('Памылка захавання камэнтара:', error);
    } finally {
      setIsSavingComment(false);
    }
  }, [selectedWord, documentId, wordEditingService, setIsSavingComment]);

  return {
    handleSaveParadigm,
    handleUpdateWordText,
    handleSaveManualCategories,
    handleSaveComment,
  };
}
