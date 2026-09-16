import { useEffect } from 'react';
import {
  Alert,
  Card,
  ErrorScreen,
  LoadingScreen,
  PageShell,
} from '@/app/components';
import { useDocumentStore } from '@/app/docs/store';
import { useUIStore } from '@/app/docs/uiStore';
import { DocumentsListHeader } from '@/app/components/documents/DocumentsListHeader';
import { DocumentsTable } from '@/app/components/documents/DocumentsTable';
import { useAuthStore } from '@/app/auth/store';
import { Roles } from '@/app/auth/types';
import { UploadJobState } from '@/app/docs/types';
import { useConfig } from '@/app/hooks/useConfig';

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
  const tagDocument = useDocumentStore(s => s.tagDocument);
  const tagAllDocuments = useDocumentStore(s => s.tagAllDocuments);
  const listActionError = useDocumentStore(s => s.listActionError);
  const clearListActionError = useDocumentStore(s => s.clearListActionError);
  const { displayMode, setDisplayMode } = useUIStore();
  const { user } = useAuthStore();
  const config = useConfig();

  const isExpanded = displayMode === 'full';
  // Загрузка і заданьні загрузкі - толькі для рэдактара і адміністратара (гл. Registry.cs)
  const canUpload = (user?.role ?? Roles.None) >= Roles.Editor;

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
    if (!canUpload) return;
    pollUploadJobs();
  }, [canUpload, pollUploadJobs]);

  // Апытваем толькі пакуль нешта апрацоўваецца; апошні цыкл, які заўважыць завяршэньне, сам жа і спыніць таймэр
  useEffect(() => {
    if (!canUpload || !hasActiveJobs) return;

    const interval = setInterval(pollUploadJobs, UPLOAD_JOBS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [canUpload, hasActiveJobs, pollUploadJobs]);

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
          canUpload={canUpload}
        />
        {listActionError && (
          <Alert kind="error" onClose={clearListActionError}>
            {listActionError}
          </Alert>
        )}
        <DocumentsTable
          documents={documentsList}
          uploadJobs={uploadJobs}
          recentlyCompletedIds={recentlyCompletedIds}
          isExpanded={isExpanded}
          stanzaEnabled={config?.stanzaEnabled}
          onRefresh={refreshDocumentHeader}
          onRefreshList={refreshDocumentsList}
          onDismissUploadJob={dismissUploadJob}
          onTag={tagDocument}
          onTagAll={tagAllDocuments}
          userRole={user?.role}
        />
      </Card>
    </PageShell>
  );
}
