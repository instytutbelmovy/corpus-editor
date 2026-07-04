import { useEffect } from 'react';
import { LoadingScreen, ErrorScreen } from '@/app/components';
import { useDocumentStore } from '@/app/docs/store';
import { useUIStore } from '@/app/docs/uiStore';
import { DocumentsListHeader } from '@/app/components/documents/DocumentsListHeader';
import { DocumentsTable } from '@/app/components/documents/DocumentsTable';
import { useAuthStore } from '@/app/auth/store';

export default function Home() {
  const { documentsList, loading, error, fetchDocuments, documentService, refreshDocumentHeader, refreshDocumentsList } = useDocumentStore();
  const { displayMode, setDisplayMode } = useUIStore();
  const { user } = useAuthStore();

  const isExpanded = displayMode === 'full';

  useEffect(() => {
    if (documentService) {
      fetchDocuments();
    }
  }, [fetchDocuments, documentService]);

  const handleToggleExpanded = () => {
    setDisplayMode(isExpanded ? 'compact' : 'full');
  };

  if (loading) {
    return <LoadingScreen message="Загрузка дакумэнтаў..." />;
  }

  if (error) {
    return <ErrorScreen error={error} title="Памылка" showBackButton={false} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-2 lg:px-4 pt-4 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <DocumentsListHeader
            isExpanded={isExpanded}
            onToggleExpanded={handleToggleExpanded}
          />
          <DocumentsTable
            documents={documentsList}
            isExpanded={isExpanded}
            onRefresh={refreshDocumentHeader}
            onRefreshList={refreshDocumentsList}
            userRole={user?.role}
          />
        </div>
      </div>
    </div>
  );
}

