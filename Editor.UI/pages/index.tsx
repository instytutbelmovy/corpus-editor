import { useEffect } from 'react';
import { Card, ErrorScreen, LoadingScreen, PageShell } from '@/app/components';
import { useDocumentStore } from '@/app/docs/store';
import { useUIStore } from '@/app/docs/uiStore';
import { DocumentsListHeader } from '@/app/components/documents/DocumentsListHeader';
import { DocumentsTable } from '@/app/components/documents/DocumentsTable';
import { useAuthStore } from '@/app/auth/store';

export default function Home() {
  const {
    documentsList,
    loading,
    error,
    fetchDocuments,
    refreshDocumentHeader,
    refreshDocumentsList,
  } = useDocumentStore();
  const { displayMode, setDisplayMode } = useUIStore();
  const { user } = useAuthStore();

  const isExpanded = displayMode === 'full';

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  if (loading) {
    return <LoadingScreen message="Загрузка дакумэнтаў..." />;
  }

  if (error) {
    return <ErrorScreen error={error} title="Памылка" showBackButton={false} />;
  }

  return (
    <PageShell>
      <Card>
        <DocumentsListHeader
          isExpanded={isExpanded}
          onToggleExpanded={() =>
            setDisplayMode(isExpanded ? 'compact' : 'full')
          }
        />
        <DocumentsTable
          documents={documentsList}
          isExpanded={isExpanded}
          onRefresh={refreshDocumentHeader}
          onRefreshList={refreshDocumentsList}
          userRole={user?.role}
        />
      </Card>
    </PageShell>
  );
}
