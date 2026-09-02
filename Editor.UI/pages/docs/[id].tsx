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
  Toolbar,
} from '@/app/docs/components';
import {
  Card,
  ErrorScreen,
  LoadingScreen,
  PageShell,
} from '@/app/components';
import { useEffect } from 'react';
import { useUIStore } from '@/app/docs/uiStore';
import { useDocumentStore } from '@/app/docs/store';
import { WordEditingService } from '@/app/docs/wordEditingService';
import { serviceLocator } from '@/app/services/serviceLocator';

const wordEditingService = new WordEditingService(
  serviceLocator.documentService
);

export default function DocumentPage() {
  const router = useRouter();
  const documentId = router.query.id as string;
  const { isStructureEditingMode, setIsStructureEditingMode } = useUIStore();

  // Скідваем рэжым рэдагаваньня пры змене дакумэнта
  useEffect(() => {
    setIsStructureEditingMode(false);
  }, [documentId, setIsStructureEditingMode]);

  // Хукі для работы з дакумэнтам
  const { documentData, loading, error, loadingMore, hasMore, fetchDocument } =
    useDocument(documentId);

  // Хукі для выбару і рэдагаваньня слоў
  const {
    selectedWord,
    selectWord,
    clearSelectedWord,
    saveError,
    clearSaveError,
    pendingSaves,
  } = useWordSelection();

  // Скідваем выбранае слова пры змене рэжыму рэдагаваньня структуры
  useEffect(() => {
    clearSelectedWord();
    if (isStructureEditingMode) {
      useDocumentStore.getState().startEditing();
    }
  }, [isStructureEditingMode, clearSelectedWord]);

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
    <PageShell fullHeight>
      <Card className="p-6 flex-1 flex flex-col">
        <DocumentHeader header={documentData.header} />

        {isStructureEditingMode && <Toolbar />}
        <div className="flex flex-col lg:flex-row gap-6 flex-1">
          <div className="flex-1">
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

          {/* Панэль рэдагаваньня — толькі ў рэжыме прагляду */}
          {!isStructureEditingMode && (
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
          )}
        </div>
      </Card>
    </PageShell>
  );
}
