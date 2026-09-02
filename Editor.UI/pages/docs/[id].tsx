import { useRouter } from 'next/router';
import { useEffect } from 'react';
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
import { useUIStore } from '@/app/docs/uiStore';
import { useDocumentStore } from '@/app/docs/store';

export default function DocumentPage() {
  const router = useRouter();
  const documentId = router.query.id as string;
  const { isStructureEditingMode, setIsStructureEditingMode } = useUIStore();

  // Скідваем рэжым рэдагаваньня пры зьмене дакумэнта
  useEffect(() => {
    setIsStructureEditingMode(false);
  }, [documentId, setIsStructureEditingMode]);

  const { documentData, loading, error, loadingMore, hasMore, fetchDocument } =
    useDocument(documentId);

  const {
    selectedWord,
    selectWord,
    clearSelectedWord,
    saveError,
    clearSaveError,
    pendingSaves,
  } = useWordSelection();

  // Пры пераключэньні рэжыму структуры скідваем выбар і бярэм новы baseline
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
  } = useWordEditing(documentId);

  useKeyboardNavigation();

  const observerRef = useInfiniteScroll({
    onLoadMore: skipUpToId => fetchDocument(documentId, skipUpToId, false),
  });

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
              onWordClick={selectWord}
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
