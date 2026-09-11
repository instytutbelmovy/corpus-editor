import { useEffect } from 'react';
import { Card, ErrorScreen, LoadingScreen, PageShell } from '@/app/components';
import { useDocumentStore } from '@/app/docs/store';
import { useUIStore } from '@/app/docs/uiStore';
import { DocumentsListHeader } from '@/app/components/documents/DocumentsListHeader';
import { DocumentsTable } from '@/app/components/documents/DocumentsTable';
import { useAuthStore } from '@/app/auth/store';
import { UploadJobState } from '@/app/docs/types';

const UPLOAD_JOBS_POLL_INTERVAL_MS = 2000;

export default function Home() {
  // Вузкія сэлектары: інакш старонка перамалёўваецца на кожнае абнаўленьне любой часткі стору
  const documentsList = useDocumentStore(s => s.documentsList);
  const uploadJobs = useDocumentStore(s => s.uploadJobs);
  const recentlyCompletedIds = useDocumentStore(s => s.recentlyCompletedIds);
  const loading = useDocumentStore(s => s.loading);
  const error = useDocumentStore(s => s.error);
  const fetchDocuments = useDocumentStore(s => s.fetchDocuments);
  const refreshDocumentHeader = useDocumentStore(s => s.refreshDocumentHeader);
  const refreshDocumentsList = useDocumentStore(s => s.refreshDocumentsList);
  const pollUploadJobs = useDocumentStore(s => s.pollUploadJobs);
  const dismissUploadJob = useDocumentStore(s => s.dismissUploadJob);
  const { displayMode, setDisplayMode } = useUIStore();
  const { user } = useAuthStore();

  const isExpanded = displayMode === 'full';

  // Памылковыя заданьні ўжо завершаныя - апытваць дзеля іх няма чаго
  const hasActiveJobs = uploadJobs.some(
    job =>
      job.state === UploadJobState.Queued ||
      job.state === UploadJobState.Running
  );

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    pollUploadJobs();
  }, [pollUploadJobs]);

  // Апытваем толькі пакуль нешта апрацоўваецца; апошні цыкл, які заўважыць завяршэньне, сам жа і спыніць таймэр
  useEffect(() => {
    if (!hasActiveJobs) return;

    const interval = setInterval(pollUploadJobs, UPLOAD_JOBS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasActiveJobs, pollUploadJobs]);

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
          uploadJobs={uploadJobs}
          recentlyCompletedIds={recentlyCompletedIds}
          isExpanded={isExpanded}
          onRefresh={refreshDocumentHeader}
          onRefreshList={refreshDocumentsList}
          onDismissUploadJob={dismissUploadJob}
          userRole={user?.role}
        />
      </Card>
    </PageShell>
  );
}
