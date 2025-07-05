import { useRouter } from 'next/router';
import { useCallback } from 'react';
import {
  LinguisticItem as LinguisticItemType,
  ParadigmFormId,
  LinguisticTag,
} from '@/types/document';
import {
  useDocument,
  useSelectedWord,
  useKeyboardNavigation,
  useInfiniteScroll,
} from '@/app/docs/hooks';
import {
  DocumentHeader,
  DocumentContent,
  EditingPanel,
} from '@/app/docs/components';
import { LoadingScreen, ErrorScreen } from '@/app/components';

export default function DocumentPage() {
  const router = useRouter();
  const documentId = router.query.id as string;

  // Хукі для работы з дакумэнтам
  const {
    documentData,
    loading,
    error,
    loadingMore,
    hasMore,
    lastParagraphId,
    fetchDocument,
    updateDocument,
  } = useDocument(documentId);

  const {
    selectedWord,
    setSelectedWord,
    saveError,
    setSaveError,
    pendingSaves,
    handleSaveParadigm,
    handleUpdateWordText,
    handleSaveManualCategories,
    handleSaveComment,
  } = useSelectedWord(documentId, documentData);

  // Хук для клавіятурнай навігацыі
  useKeyboardNavigation(selectedWord, () => setSelectedWord(null));

  // Хук для бясконцай пракруткі
  const observerRef = useInfiniteScroll({
    hasMore,
    loadingMore,
    loading,
    lastParagraphId,
    onLoadMore: skipUpToId => fetchDocument(skipUpToId, false),
  });

  // Функцыя для выбару слова для рэдагавання
  const handleWordClick = useCallback(
    (item: LinguisticItemType) => {
      if (item.type !== 1 || !documentData) return;

      // Знаходзім параграф, сказ і індекс слова
      for (const paragraph of documentData.paragraphs) {
        for (const sentence of paragraph.sentences) {
          const wordIndex = sentence.sentenceItems.findIndex(
            sentenceItem => sentenceItem.linguisticItem === item
          );
          if (wordIndex !== -1) {
            setSelectedWord({
              paragraphId: paragraph.id,
              paragraphStamp: paragraph.concurrencyStamp,
              sentenceId: sentence.id,
              sentenceStamp: sentence.concurrencyStamp,
              wordIndex: wordIndex,
              item: item,
              options: sentence.sentenceItems[wordIndex].options,
            });
            return;
          }
        }
      }
    },
    [documentData, setSelectedWord]
  );

  // Функцыя для захавання парадыгмы
  const handleSaveParadigmWrapper = useCallback(
    async (paradigmFormId: ParadigmFormId) => {
      if (!documentData) return;

      await handleSaveParadigm(paradigmFormId, updateDocument);
    },
    [documentData, handleSaveParadigm, updateDocument]
  );

  // Функцыя для абнаўлення тэксту слова
  const handleUpdateWordTextWrapper = useCallback(
    async (text: string) => {
      if (!documentData) return;

      await handleUpdateWordText(text, updateDocument);
    },
    [documentData, handleUpdateWordText, updateDocument]
  );

  // Функцыя для захавання ручна ўведзеных катэгорый
  const handleSaveManualCategoriesWrapper = useCallback(
    async (lemma: string, linguisticTag: LinguisticTag) => {
      if (!documentData) return;

      await handleSaveManualCategories(lemma, linguisticTag, updateDocument);
    },
    [documentData, handleSaveManualCategories, updateDocument]
  );

  // Функцыя для захавання каментара
  const handleSaveCommentWrapper = useCallback(
    async (comment: string) => {
      if (!documentData) return;

      await handleSaveComment(comment, updateDocument);
    },
    [documentData, handleSaveComment, updateDocument]
  );

  // Станы загрузкі і памылак
  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  if (!documentData) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 flex-1 flex flex-col max-h-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1 flex flex-col min-h-0 max-h-full">
          {/* Загаловак */}
          <DocumentHeader header={documentData.header} />

          {/* Асноўны кантэнт з тэкстам і панэллю рэдагавання */}
          <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 max-h-full">
            {/* Тэкст дакумэнта */}
            <div className="flex-1 overflow-y-auto min-h-0 max-h-full">
              <DocumentContent
                documentData={documentData}
                selectedWord={selectedWord}
                pendingSaves={pendingSaves}
                loadingMore={loadingMore}
                hasMore={hasMore}
                onWordClick={handleWordClick}
                observerRef={observerRef}
              />
            </div>

            {/* Панэль рэдагавання */}
            <EditingPanel
              selectedWord={selectedWord}
              saveError={saveError}
              onClose={() => setSelectedWord(null)}
              onSaveParadigm={handleSaveParadigmWrapper}
              onClearError={() => setSaveError(null)}
              onUpdateWordText={handleUpdateWordTextWrapper}
              onSaveManualCategories={handleSaveManualCategoriesWrapper}
              onSaveComment={handleSaveCommentWrapper}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
