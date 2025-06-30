'use client';

import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import {
  LinguisticItem as LinguisticItemType,
  ParadigmFormId,
} from '@/types/document';
import {
  useDocument,
  useSelectedWord,
  useKeyboardNavigation,
  useInfiniteScroll,
} from './hooks';
import { DocumentHeader, DocumentContent, EditingPanel } from './components';
import { LoadingScreen, ErrorScreen } from '@/components';

export default function DocumentPage() {
  const params = useParams();
  const documentId = params.id as string;

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
    [documentData]
  );

  // Функцыя для захавання парадыгмы
  const handleSaveParadigmWrapper = useCallback(
    async (paradigmFormId: ParadigmFormId) => {
      if (!documentData) return;

      await handleSaveParadigm(paradigmFormId, updateDocument);
    },
    [documentData, handleSaveParadigm, updateDocument]
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Загаловак */}
          <DocumentHeader header={documentData.header} />

          {/* Асноўны кантэнт з тэкстам і панэллю рэдагавання */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Тэкст дакумэнта */}
            <DocumentContent
              documentData={documentData}
              selectedWord={selectedWord?.item || null}
              pendingSaves={pendingSaves}
              loadingMore={loadingMore}
              hasMore={hasMore}
              onWordClick={handleWordClick}
              observerRef={observerRef}
            />

            {/* Панэль рэдагавання */}
            <EditingPanel
              selectedWord={selectedWord}
              saveError={saveError}
              onClose={() => setSelectedWord(null)}
              onSaveParadigm={handleSaveParadigmWrapper}
              onClearError={() => setSaveError(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
