import { useDocumentStore } from '@/app/docs/store';
import {
  DocumentHeader,
  UploadJobStage,
  UploadJobState,
  UploadJobStatus,
} from '@/app/docs/types';
import { serviceLocator } from '@/app/services/serviceLocator';

jest.mock('@/app/services/serviceLocator', () => ({
  serviceLocator: {
    documentService: {
      getUploadJobs: jest.fn(),
      fetchDocuments: jest.fn(),
    },
  },
}));

const documentService = serviceLocator.documentService as jest.Mocked<
  typeof serviceLocator.documentService
>;

const job = (
  id: string,
  state: UploadJobState,
  stage = UploadJobStage.Done
): UploadJobStatus => ({
  id,
  n: 1,
  title: 'Дакумэнт',
  state,
  stage,
  processedTokens: 0,
  totalTokens: 0,
  error: state === UploadJobState.Failed ? 'Не ўдалося апрацаваць' : null,
  createdAt: '2026-01-01T00:00:00Z',
  completedAt: null,
});

const poll = () => useDocumentStore.getState().pollUploadJobs();

describe('DocumentStore upload jobs polling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    documentService.fetchDocuments.mockResolvedValue([] as DocumentHeader[]);
    useDocumentStore.setState({
      documentsList: [],
      uploadJobs: [],
      recentlyCompletedIds: new Set(),
      dismissedJobIds: new Set(),
      _seenJobStates: new Map(),
      _uploadJobsPolled: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refreshes the documents list once when a job succeeds, not on every poll', async () => {
    const running = job('a', UploadJobState.Running, UploadJobStage.Tagging);
    const succeeded = job('a', UploadJobState.Succeeded);

    documentService.getUploadJobs
      .mockResolvedValueOnce([running])
      .mockResolvedValueOnce([succeeded])
      .mockResolvedValueOnce([succeeded])
      .mockResolvedValueOnce([succeeded]);

    await poll();
    await poll();
    await poll();
    await poll();

    // Сэрвэр трымае завершанае заданьне яшчэ гадзіну - але сьпіс перачытваецца толькі раз
    expect(documentService.fetchDocuments).toHaveBeenCalledTimes(1);
    expect(useDocumentStore.getState().uploadJobs).toEqual([]);
    // Фонавае абнаўленьне не мусіць замяняць старонку экранам загрузкі
    expect(useDocumentStore.getState().loading).toBe(false);
  });

  it('ignores jobs that were already succeeded before the page opened', async () => {
    documentService.getUploadJobs.mockResolvedValue([
      job('a', UploadJobState.Succeeded),
    ]);

    await poll();
    await poll();

    expect(documentService.fetchDocuments).not.toHaveBeenCalled();
    expect(useDocumentStore.getState().recentlyCompletedIds.size).toBe(0);
  });

  it('keeps a dismissed failed job hidden on later polls', async () => {
    documentService.getUploadJobs.mockResolvedValue([
      job('a', UploadJobState.Failed),
    ]);

    await poll();
    expect(useDocumentStore.getState().uploadJobs).toHaveLength(1);

    useDocumentStore.getState().dismissUploadJob('a');
    await poll();

    expect(useDocumentStore.getState().uploadJobs).toEqual([]);
  });

  it('keeps the same array reference while nothing changes', async () => {
    documentService.getUploadJobs.mockResolvedValue([
      job('a', UploadJobState.Running, UploadJobStage.Tagging),
    ]);

    await poll();
    const first = useDocumentStore.getState().uploadJobs;
    await poll();

    expect(useDocumentStore.getState().uploadJobs).toBe(first);
  });
});
