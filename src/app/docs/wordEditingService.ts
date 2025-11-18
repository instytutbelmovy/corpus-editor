import { DocumentData, SelectedWord, ParadigmFormId, LinguisticTag, GrammarInfo } from './types';
import { DocumentService } from './service';
import { useDocumentStore } from './store';
import { useUIStore } from './uiStore';

export class WordEditingService {
  private documentService: DocumentService;

  constructor(documentService: DocumentService) {
    this.documentService = documentService;
  }

  // Пошук наступнага незарэзолвленага слова
  findNextUnresolvedWord(documentData: DocumentData | null, selectedWord: SelectedWord | null): SelectedWord | null {
    if (!documentData) return null;

    let foundCurrent = false;

    for (const paragraph of documentData.paragraphs) {
      for (const sentence of paragraph.sentences) {
        for (let wordIndex = 0; wordIndex < sentence.sentenceItems.length; wordIndex++) {
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
        for (let wordIndex = 0; wordIndex < sentence.sentenceItems.length; wordIndex++) {
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
  }

  // Захаванне выбару парадыгмы
  async saveParadigmFormId(
    documentId: string,
    selectedWord: SelectedWord,
    paradigmFormId: ParadigmFormId
  ): Promise<void> {
    const { updateDocument } = useDocumentStore.getState();
    const { setSelectedWord, addPendingSave, removePendingSave, setSaveError } = useUIStore.getState();

    // Правяраем, ці ўжо выбрана гэтая парадыгма
    const currentParadigmFormId = selectedWord.item.paradigmFormId;
    const isAlreadySelected =
      currentParadigmFormId &&
      currentParadigmFormId.paradigmId === paradigmFormId.paradigmId &&
      currentParadigmFormId.variantId === paradigmFormId.variantId &&
      currentParadigmFormId.formTag === paradigmFormId.formTag;

    // Калі парадыгма ўжо выбрана, проста пераходзім да наступнага слова
    if (isAlreadySelected) {
      const { documentData } = useDocumentStore.getState();
      const nextWord = this.findNextUnresolvedWord(documentData, selectedWord);
      setSelectedWord(nextWord);
      return;
    }

    const wordKey = `${selectedWord.paragraphId}-${selectedWord.sentenceId}-${selectedWord.wordIndex}`;

    // Адразу пераходзім да наступнага слова
    const { documentData } = useDocumentStore.getState();
    const nextWord = this.findNextUnresolvedWord(documentData, selectedWord);
    setSelectedWord(nextWord);

    // Дадаем слова ў спіс чакаючых захавання
    addPendingSave(wordKey);

    // Абнаўляем лакальна толькі парадыгму
    updateDocument(prev => {
      if (!prev) return prev;
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
              opt.paradigmFormId !== null &&
              opt.paradigmFormId.paradigmId === paradigmFormId.paradigmId &&
              opt.paradigmFormId.variantId === paradigmFormId.variantId &&
              opt.paradigmFormId.formTag === paradigmFormId.formTag
          );
          if (selectedOption) {
            item.linguisticItem.lemma = selectedOption.lemma;
            item.linguisticItem.linguisticTag = selectedOption.linguisticTag;
          }
        }
      }
      return newData;
    });

    try {
      await this.documentService.saveParadigmFormId(
        documentId,
        selectedWord.paragraphId,
        selectedWord.paragraphStamp,
        selectedWord.sentenceId,
        selectedWord.sentenceStamp,
        selectedWord.wordIndex,
        paradigmFormId
      );

      // Пасля паспяховага захавання ўсталёўваем resolvedOn
      updateDocument(prev => {
        if (!prev) return prev;
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
            item.linguisticItem.metadata.resolvedOn = new Date().toISOString();
          }
        }
        return newData;
      });

      removePendingSave(wordKey);
    } catch (err) {
      // У выпадку памылкі вяртаем слова ў нявызначаны стан
      updateDocument(prev => {
        if (!prev) return prev;
        const newData = { ...prev };
        for (const paragraph of newData.paragraphs) {
          if (paragraph.id !== selectedWord.paragraphId) continue;
          for (const sentence of paragraph.sentences) {
            if (sentence.id !== selectedWord.sentenceId) continue;
            const item = sentence.sentenceItems[selectedWord.wordIndex];
            // Вяртаем да папярэдняга стану
            item.linguisticItem.paradigmFormId = selectedWord.item.paradigmFormId;
            item.linguisticItem.lemma = selectedWord.item.lemma;
            item.linguisticItem.linguisticTag = selectedWord.item.linguisticTag;
            if (item.linguisticItem.metadata) {
              item.linguisticItem.metadata.resolvedOn = selectedWord.item.metadata?.resolvedOn || null;
            }
          }
        }
        return newData;
      });

      removePendingSave(wordKey);

      const errorMessage = err instanceof Error ? err.message : 'Невядомая памылка';
      setSaveError(errorMessage);
      throw err;
    }
  }

  // Абнаўленне тэксту слова
  async updateWordText(
    documentId: string,
    selectedWord: SelectedWord,
    text: string
  ): Promise<void> {
    const { updateDocument } = useDocumentStore.getState();
    const { setSelectedWord, setSaveError } = useUIStore.getState();

    try {
      const newOptions: GrammarInfo[] = await this.documentService.updateWordText(
        documentId,
        selectedWord.paragraphId,
        selectedWord.paragraphStamp,
        selectedWord.sentenceId,
        selectedWord.sentenceStamp,
        selectedWord.wordIndex,
        text
      );

      // Абнаўляем дакумэнт з новым тэкстам і варыянтамі
      updateDocument(prev => {
        if (!prev) return prev;
        const newData = { ...prev };
        for (const paragraph of newData.paragraphs) {
          if (paragraph.id !== selectedWord.paragraphId) continue;
          for (const sentence of paragraph.sentences) {
            if (sentence.id !== selectedWord.sentenceId) continue;
            const item = sentence.sentenceItems[selectedWord.wordIndex];

            // Абнаўляем тэкст слова
            item.linguisticItem.text = text;

            // Скідаем выбраную парадыгму, бо слова змянілася
            item.linguisticItem.paradigmFormId = null;
            item.linguisticItem.lemma = null;
            item.linguisticItem.linguisticTag = null;

            // Скідаем метададзеныя
            if (item.linguisticItem.metadata) {
              item.linguisticItem.metadata.resolvedOn = null;
            }

            // Абнаўляем варыянты
            item.options = newOptions;
          }
        }
        return newData;
      });

      // Абнаўляем выбранае слова з новымі дадзенымі
      setSelectedWord({
        ...selectedWord,
        item: {
          ...selectedWord.item,
          text: text,
          paradigmFormId: null,
          lemma: null,
          linguisticTag: null,
          metadata: selectedWord.item.metadata
            ? {
                ...selectedWord.item.metadata,
                resolvedOn: null,
              }
            : null,
        },
        options: newOptions,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Невядомая памылка';
      setSaveError(errorMessage);
      throw err;
    }
  }

  // Захаванне ручна ўведзеных лінгвістычных катэгорый
  async saveManualCategories(
    documentId: string,
    selectedWord: SelectedWord,
    lemma: string,
    linguisticTag: LinguisticTag
  ): Promise<void> {
    const { updateDocument } = useDocumentStore.getState();
    const { setSelectedWord, addPendingSave, removePendingSave, setSaveError } = useUIStore.getState();

    const wordKey = `${selectedWord.paragraphId}-${selectedWord.sentenceId}-${selectedWord.wordIndex}`;

    // Дадаем слова ў спіс чакаючых захавання
    addPendingSave(wordKey);

    // Абнаўляем лакальна толькі лему і тэг
    updateDocument(prev => {
      if (!prev) return prev;
      const newData = { ...prev };
      for (const paragraph of newData.paragraphs) {
        if (paragraph.id !== selectedWord.paragraphId) continue;
        for (const sentence of paragraph.sentences) {
          if (sentence.id !== selectedWord.sentenceId) continue;
          const item = sentence.sentenceItems[selectedWord.wordIndex];
          item.linguisticItem.paradigmFormId = null;
          item.linguisticItem.lemma = lemma;
          item.linguisticItem.linguisticTag = linguisticTag;
        }
      }
      return newData;
    });

    try {
      // Фарматуем linguisticTag для API
      const tagString = linguisticTag.paradigmTag + (linguisticTag.formTag ? '|' + linguisticTag.formTag : '');

      await this.documentService.saveLemmaTag(
        documentId,
        selectedWord.paragraphId,
        selectedWord.paragraphStamp,
        selectedWord.sentenceId,
        selectedWord.sentenceStamp,
        selectedWord.wordIndex,
        lemma,
        tagString
      );

      // Пасля паспяховага захавання ўсталёўваем resolvedOn
      updateDocument(prev => {
        if (!prev) return prev;
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
            item.linguisticItem.metadata.resolvedOn = new Date().toISOString();
          }
        }
        return newData;
      });

      removePendingSave(wordKey);

      // Перазагружаем дакумэнт у фоне, каб абнавіць кастомныя словы
      const { reloadDocument } = useDocumentStore.getState();
      reloadDocument(documentId).catch(err => {
        console.error('Памылка перазагрузкі дакумэнта:', err);
      });

      // Пераходзім да наступнага слова
      const { documentData } = useDocumentStore.getState();
      const nextWord = this.findNextUnresolvedWord(documentData, selectedWord);
      setSelectedWord(nextWord);
    } catch (err) {
      // У выпадку памылкі вяртаем слова ў нявызначаны стан
      updateDocument(prev => {
        if (!prev) return prev;
        const newData = { ...prev };
        for (const paragraph of newData.paragraphs) {
          if (paragraph.id !== selectedWord.paragraphId) continue;
          for (const sentence of paragraph.sentences) {
            if (sentence.id !== selectedWord.sentenceId) continue;
            const item = sentence.sentenceItems[selectedWord.wordIndex];
            // Вяртаем да папярэдняга стану
            item.linguisticItem.paradigmFormId = selectedWord.item.paradigmFormId;
            item.linguisticItem.lemma = selectedWord.item.lemma;
            item.linguisticItem.linguisticTag = selectedWord.item.linguisticTag;
            if (item.linguisticItem.metadata) {
              item.linguisticItem.metadata.resolvedOn = selectedWord.item.metadata?.resolvedOn || null;
            }
          }
        }
        return newData;
      });

      removePendingSave(wordKey);

      const errorMessage = err instanceof Error ? err.message : 'Невядомая памылка';
      setSaveError(errorMessage);
      throw err;
    }
  }

  // Захаванне каментара
  async saveComment(
    documentId: string,
    selectedWord: SelectedWord,
    comment: string
  ): Promise<void> {
    const { updateDocument } = useDocumentStore.getState();
    const { setSelectedWord } = useUIStore.getState();

    // Правяраем, ці змяніўся каментар
    if (selectedWord.item.comment === comment) {
      return;
    }

    try {
      await this.documentService.saveComment(
        documentId,
        selectedWord.paragraphId,
        selectedWord.paragraphStamp,
        selectedWord.sentenceId,
        selectedWord.sentenceStamp,
        selectedWord.wordIndex,
        comment
      );

      // Абнаўляем лакальна пасля паспяховага захавання
      updateDocument(prev => {
        if (!prev) return prev;
        const newData = { ...prev };
        for (const paragraph of newData.paragraphs) {
          if (paragraph.id !== selectedWord.paragraphId) continue;
          for (const sentence of paragraph.sentences) {
            if (sentence.id !== selectedWord.sentenceId) continue;
            const item = sentence.sentenceItems[selectedWord.wordIndex];
            item.linguisticItem.comment = comment;
          }
        }
        return newData;
      });

      // Абнаўляем выбранае слова з новым каментарам
      setSelectedWord({
        ...selectedWord,
        item: {
          ...selectedWord.item,
          comment: comment,
        },
      });
    } catch (err) {
      console.error('Памылка захавання каментара:', err);
      // Для каментараў не паказваем памылку карыстальніку, толькі логуем
    }
  }
}