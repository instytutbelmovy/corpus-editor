import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { LinguisticItem as LinguisticItemType } from '@/app/docs/types';
import {
  useDocument,
  useWordSelection,
  useWordEditing,
  useKeyboardNavigation,
  useInfiniteScroll,
} from '@/app/docs/hooks';
import {
  DocumentHeader,
  DocumentContent,
  EditingPanel,
} from '@/app/docs/components';
import { LoadingScreen, ErrorScreen } from '@/app/components';
import { useAuth } from '../_app';
import { WordEditingService } from '@/app/docs/wordEditingService';

export default function DocumentPage() {
  const router = useRouter();
  const documentId = router.query.id as string;
  const { documentService } = useAuth();

  // Хукі для работы з дакумэнтам
  const {
    documentData,
    loading,
    error,
    loadingMore,
    hasMore,
    fetchDocument,
  } = useDocument(documentId);

  // Хукі для выбару і рэдагаваньня слоў
  const {
    selectedWord,
    selectWord,
    clearSelectedWord,
    saveError,
    clearSaveError,
    pendingSaves,
  } = useWordSelection();

  // Ініцыялізуем WordEditingService
  const wordEditingService = new WordEditingService(documentService!);
  const {
    handleSaveParadigm,
    handleUpdateWordText,
    handleSaveManualCategories,
    handleSaveComment,
    handleSaveErrorType,
  } = useWordEditing(documentId, wordEditingService);

  // Хук для клавіятурнай навігацыі
  useKeyboardNavigation();

  // Хук для бясконцай пракруткі
  const observerRef = useInfiniteScroll({
    onLoadMore: skipUpToId => fetchDocument(documentId, skipUpToId, false),
  });

  // Функцыя для выбару слова для рэдагаваньня
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
            selectWord(item, paragraph.id, sentence.id, wordIndex);
            return;
          }
        }
      }
    },
    [documentData, selectWord]
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
      <div className="max-w-7xl mx-auto px-2 sm:px-2 lg:px-4 pt-4 pb-8 flex-1 flex flex-col max-h-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1 flex flex-col min-h-0 max-h-full">
          {/* Загаловак */}
          <DocumentHeader header={documentData.header} />

          {/* Асноўны кантэнт з тэкстам і панэллю рэдагаваньня */}
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

            {/* Панэль рэдагаваньня */}
            <EditingPanel
              selectedWord={selectedWord}
              saveError={saveError}
              onClose={clearSelectedWord}
              onSaveParadigm={handleSaveParadigm}
              onClearError={clearSaveError}
              onUpdateWordText={handleUpdateWordText}
              onSaveManualCategories={handleSaveManualCategories}
              onSaveComment={handleSaveComment}
              onSaveErrorType={handleSaveErrorType}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
