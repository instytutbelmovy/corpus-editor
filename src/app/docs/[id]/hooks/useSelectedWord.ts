import { useState, useCallback } from 'react';
import { SelectedWord, DocumentData, ParadigmFormId } from '@/types/document';
import { documentService } from '@/services/documentService';

export function useSelectedWord(
  documentId: string,
  documentData: DocumentData | null
) {
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());

  // Функцыя для пошуку наступнага незарэзолвленага слова
  const findNextUnresolvedWord = useCallback(() => {
    if (!documentData) return null;

    let foundCurrent = false;

    for (const paragraph of documentData.paragraphs) {
      for (const sentence of paragraph.sentences) {
        for (
          let wordIndex = 0;
          wordIndex < sentence.sentenceItems.length;
          wordIndex++
        ) {
          const sentenceItem = sentence.sentenceItems[wordIndex];
          const item = sentenceItem.linguisticItem;

          // Пропускаем не-словы
          if (item.type !== 1) continue;

          // Калі гэта бягучае слова, пазначаем што знайшлі яго
          if (
            selectedWord &&
            paragraph.id === selectedWord.paragraphId &&
            sentence.id === selectedWord.sentenceId &&
            wordIndex === selectedWord.wordIndex
          ) {
            foundCurrent = true;
            continue;
          }

          // Калі ўжо знайшлі бягучае слова, шукаем наступнае незарэзолвленае
          if (foundCurrent && !item.metadata?.resolvedOn) {
            return {
              paragraphId: paragraph.id,
              paragraphStamp: paragraph.concurrencyStamp,
              sentenceId: sentence.id,
              sentenceStamp: sentence.concurrencyStamp,
              wordIndex: wordIndex,
              item: item,
              options: sentenceItem.options,
            };
          }
        }
      }
    }

    // Калі не знайшлі пасля бягучага, шукаем з пачатку
    for (const paragraph of documentData.paragraphs) {
      for (const sentence of paragraph.sentences) {
        for (
          let wordIndex = 0;
          wordIndex < sentence.sentenceItems.length;
          wordIndex++
        ) {
          const sentenceItem = sentence.sentenceItems[wordIndex];
          const item = sentenceItem.linguisticItem;

          if (item.type !== 1) continue;

          if (!item.metadata?.resolvedOn) {
            return {
              paragraphId: paragraph.id,
              paragraphStamp: paragraph.concurrencyStamp,
              sentenceId: sentence.id,
              sentenceStamp: sentence.concurrencyStamp,
              wordIndex: wordIndex,
              item: item,
              options: sentenceItem.options,
            };
          }
        }
      }
    }

    return null;
  }, [documentData, selectedWord]);

  // Функцыя для захавання выбару парадыгмы
  const handleSaveParadigm = useCallback(
    async (
      paradigmFormId: ParadigmFormId,
      onDocumentUpdate: (updater: (prev: DocumentData) => DocumentData) => void
    ) => {
      if (!selectedWord || !documentId) return;

      // Правяраем, ці ўжо выбрана гэтая парадыгма
      const currentParadigmFormId = selectedWord.item.paradigmFormId;
      const isAlreadySelected =
        currentParadigmFormId &&
        currentParadigmFormId.paradigmId === paradigmFormId.paradigmId &&
        currentParadigmFormId.variantId === paradigmFormId.variantId &&
        currentParadigmFormId.formTag === paradigmFormId.formTag;

      // Калі парадыгма ўжо выбрана, проста пераходзім да наступнага слова без захавання
      if (isAlreadySelected) {
        const nextWord = findNextUnresolvedWord();
        if (nextWord) {
          setSelectedWord(nextWord);
        } else {
          setSelectedWord(null);
        }
        return;
      }

      const wordKey = `${selectedWord.paragraphId}-${selectedWord.sentenceId}-${selectedWord.wordIndex}`;

      // Адразу пераходзім да наступнага слова
      const nextWord = findNextUnresolvedWord();
      if (nextWord) {
        setSelectedWord(nextWord);
      } else {
        setSelectedWord(null);
      }

      // Дадаем слова ў спіс чакаючых захавання ПЕРШ ЧЫМ пачынаем захаванне
      setPendingSaves(prev => new Set(prev).add(wordKey));

      // Абнаўляем лакальна толькі парадыгму, але НЕ ўсталёўваем resolvedOn
      onDocumentUpdate(prev => {
        const newData = { ...prev };
        for (const paragraph of newData.paragraphs) {
          if (paragraph.id !== selectedWord.paragraphId) continue;
          for (const sentence of paragraph.sentences) {
            if (sentence.id !== selectedWord.sentenceId) continue;
            const item = sentence.sentenceItems[selectedWord.wordIndex];
            item.linguisticItem.paradigmFormId = paradigmFormId;
            // Знаходзім выбраны GrammarInfo
            const selectedOption = selectedWord.options.find(
              opt =>
                opt.paradigmFormId.paradigmId === paradigmFormId.paradigmId &&
                opt.paradigmFormId.variantId === paradigmFormId.variantId &&
                opt.paradigmFormId.formTag === paradigmFormId.formTag
            );
            if (selectedOption) {
              item.linguisticItem.lemma = selectedOption.lemma;
              item.linguisticItem.linguisticTag = selectedOption.linguisticTag;
            }
            // НЕ ўсталёўваем resolvedOn пакуль запыт не скончыцца паспяхова
          }
        }
        return newData;
      });

      try {
        await documentService.saveParadigmFormId(
          documentId,
          selectedWord.paragraphId,
          selectedWord.paragraphStamp,
          selectedWord.sentenceId,
          selectedWord.sentenceStamp,
          selectedWord.wordIndex,
          paradigmFormId
        );

        // Пасля паспяховага захавання ўсталёўваем resolvedOn
        onDocumentUpdate(prev => {
          const newData = { ...prev };
          for (const paragraph of newData.paragraphs) {
            if (paragraph.id !== selectedWord.paragraphId) continue;
            for (const sentence of paragraph.sentences) {
              if (sentence.id !== selectedWord.sentenceId) continue;
              const item = sentence.sentenceItems[selectedWord.wordIndex];
              if (!item.linguisticItem.metadata)
                item.linguisticItem.metadata = {
                  suggested: null,
                  resolvedOn: null,
                };
              item.linguisticItem.metadata.resolvedOn =
                new Date().toISOString();
            }
          }
          return newData;
        });

        // Удаляем з спісу чакаючых пасля паспяховага захавання
        setPendingSaves(prev => {
          const newSet = new Set(prev);
          newSet.delete(wordKey);
          return newSet;
        });
      } catch (err) {
        // У выпадку памылкі вяртаем слова ў нявызначаны стан
        onDocumentUpdate(prev => {
          const newData = { ...prev };
          for (const paragraph of newData.paragraphs) {
            if (paragraph.id !== selectedWord.paragraphId) continue;
            for (const sentence of paragraph.sentences) {
              if (sentence.id !== selectedWord.sentenceId) continue;
              const item = sentence.sentenceItems[selectedWord.wordIndex];
              // Вяртаем да папярэдняга стану
              item.linguisticItem.paradigmFormId =
                selectedWord.item.paradigmFormId;
              item.linguisticItem.lemma = selectedWord.item.lemma;
              item.linguisticItem.linguisticTag =
                selectedWord.item.linguisticTag;
              if (item.linguisticItem.metadata) {
                item.linguisticItem.metadata.resolvedOn =
                  selectedWord.item.metadata?.resolvedOn || null;
              }
            }
          }
          return newData;
        });

        // Удаляем з спісу чакаючых
        setPendingSaves(prev => {
          const newSet = new Set(prev);
          newSet.delete(wordKey);
          return newSet;
        });

        const errorMessage =
          err instanceof Error ? err.message : 'Невядомая памылка';
        setSaveError(errorMessage);
      }
    },
    [selectedWord, documentId, findNextUnresolvedWord]
  );

  return {
    selectedWord,
    setSelectedWord,
    saveError,
    setSaveError,
    pendingSaves,
    handleSaveParadigm,
  };
}
