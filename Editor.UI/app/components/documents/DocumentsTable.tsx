import Link from 'next/link';
import {
  DocumentHeader,
  UploadJobKind,
  UploadJobStage,
  UploadJobState,
  UploadJobStatus,
} from '@/app/docs/types';
import { Roles } from '@/app/auth/types';
import { KebabMenu } from '../KebabMenu';
import { Table, Tbody, Td, Th, Thead, Tr } from '../Table';
import { DownloadIcon, PencilIcon, RefreshIcon, SparklesIcon } from '../icons';

interface DocumentsTableProps {
  documents: DocumentHeader[];
  uploadJobs?: UploadJobStatus[];
  recentlyCompletedIds?: Set<number>;
  isExpanded: boolean;
  stanzaEnabled?: boolean;
  onRefresh?: (documentId: number) => void;
  onRefreshList?: () => void;
  onDismissUploadJob?: (jobId: string) => void;
  onTag?: (documentId: number) => void;
  onTagAll?: () => void;
  userRole?: Roles;
}

const MAX_URL_LENGTH = 30;

const STAGE_LABELS: Record<UploadJobStage, string> = {
  [UploadJobStage.Queued]: 'У чарзе',
  [UploadJobStage.Loading]: 'Чытаньне',
  [UploadJobStage.Parsing]: 'Разбор',
  [UploadJobStage.LookingUpGrammar]: 'Пошук граматыкі',
  [UploadJobStage.Tagging]: 'Тэгаваньне',
  [UploadJobStage.Saving]: 'Захаваньне',
  [UploadJobStage.Done]: 'Гатова',
};

const EXTRA_COLUMN_COUNT = 4; // Дата публікацыі, URL, Тып, Стыль

// Адсотак паказваем толькі на этапах, дзе ён лічыцца па словах
const tokenPercent = (job: UploadJobStatus) =>
  (job.stage === UploadJobStage.Tagging ||
    job.stage === UploadJobStage.LookingUpGrammar) &&
  job.totalTokens > 0
    ? Math.round((job.processedTokens / job.totalTokens) * 100)
    : null;

const ProgressBar = ({
  percent,
  posPercent,
}: {
  percent: number;
  posPercent: number | null;
}) => {
  const tooltip =
    posPercent !== null
      ? `Разьмечана - ${percent}%, часьціна мовы ${posPercent}%`
      : `Разьмечана - ${percent}%`;

  return (
    <>
      <div
        className="relative w-16 bg-gray-200 rounded-full h-2 mr-3"
        title={tooltip}
      >
        {posPercent !== null && (
          <div
            className="absolute inset-y-0 left-0 bg-yellow-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(posPercent, percent)}%` }}
          />
        )}
        <div
          className="absolute inset-y-0 left-0 bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm text-gray-900 font-medium">{percent}%</span>
    </>
  );
};

const JobProgress = ({ job }: { job: UploadJobStatus }) => {
  const percent = tokenPercent(job);

  return (
    <div className="flex items-center">
      <span className="text-sm text-gray-700 mr-3">
        {STAGE_LABELS[job.stage]}
      </span>
      {percent !== null && <ProgressBar percent={percent} posPercent={null} />}
    </div>
  );
};

const DismissButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-gray-500 hover:text-gray-800"
    aria-label="Прыбраць"
  >
    ×
  </button>
);

export const DocumentsTable = ({
  documents,
  uploadJobs = [],
  recentlyCompletedIds = new Set(),
  isExpanded,
  stanzaEnabled = false,
  onRefresh,
  onRefreshList,
  onDismissUploadJob,
  onTag,
  onTagAll,
  userRole,
}: DocumentsTableProps) => {
  const isAdmin = userRole === Roles.Admin;
  const isEditor = (userRole ?? Roles.None) >= Roles.Editor;
  const statusColSpan = 1 + (isExpanded ? EXTRA_COLUMN_COUNT : 0);

  // Загрузкі - гэта яшчэ неіснуючыя дакумэнты, таму ім патрэбны свой радок.
  // Перазьметка ж ідзе па дакумэнце, які ў сьпісе ўжо ёсьць - паказваем яе проста ў ягоным радку
  const uploadRows = uploadJobs.filter(
    job => job.kind !== UploadJobKind.Tagging
  );
  const taggingJobs = new Map(
    uploadJobs
      .filter(job => job.kind === UploadJobKind.Tagging)
      .map(job => [job.n, job])
  );

  const headerMenuItems = [
    {
      label: 'Абнавіць сьпіс',
      icon: <RefreshIcon className="w-4 h-4 mr-3" />,
      onClick: () => onRefreshList?.(),
    },
    {
      label: 'Разьмеціць Stanza',
      icon: <SparklesIcon className="w-4 h-4 mr-3" />,
      onClick: () => onTagAll?.(),
      hidden: !stanzaEnabled,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <Table>
        <Thead>
          <Th>ID</Th>
          <Th>Назва</Th>
          <Th>Корпус</Th>
          {isExpanded && (
            <>
              <Th>Дата публікацыі</Th>
              <Th>URL</Th>
              <Th>Тып</Th>
              <Th>Стыль</Th>
            </>
          )}
          <Th>Прагрэс</Th>
          <Th>{isAdmin && <KebabMenu items={headerMenuItems} />}</Th>
        </Thead>
        <Tbody>
          {uploadRows.map(job => {
            const isFailed = job.state === UploadJobState.Failed;

            return (
              <Tr
                key={job.id}
                className={isFailed ? 'bg-red-50' : 'row-processing'}
              >
                <Td className="whitespace-nowrap font-medium text-gray-900">
                  {job.n}
                </Td>
                <Td className="text-gray-900">{job.title}</Td>
                <Td className="text-gray-900" colSpan={statusColSpan}>
                  {isFailed ? (
                    <span className="text-red-700">{job.error}</span>
                  ) : (
                    <JobProgress job={job} />
                  )}
                </Td>
                <Td className="whitespace-nowrap text-gray-900">
                  {isFailed && (
                    <DismissButton
                      onClick={() => onDismissUploadJob?.(job.id)}
                    />
                  )}
                </Td>
              </Tr>
            );
          })}
          {documents.map(doc => {
            const taggingJob = taggingJobs.get(doc.n);
            const taggingFailed = taggingJob?.state === UploadJobState.Failed;

            const rowClass = taggingFailed
              ? 'bg-red-50'
              : taggingJob
                ? 'row-processing'
                : recentlyCompletedIds.has(doc.n)
                  ? 'bg-green-50 transition-colors duration-1000'
                  : 'transition-colors duration-1000';

            return (
              <Tr key={doc.n} className={rowClass}>
                <Td className="whitespace-nowrap font-medium text-gray-900">
                  {doc.n}
                </Td>
                <Td className="text-gray-900">
                  <Link
                    href={`/docs/${doc.n}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150"
                  >
                    {doc.title}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-gray-900">
                  {doc.corpus || '-'}
                </Td>
                {isExpanded && (
                  <>
                    <Td className="whitespace-nowrap text-gray-900">
                      {doc.publicationDate || '-'}
                    </Td>
                    <Td className="whitespace-nowrap text-gray-900">
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {doc.url.length > MAX_URL_LENGTH
                            ? `${doc.url.substring(0, MAX_URL_LENGTH)}...`
                            : doc.url}
                        </a>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-gray-900">
                      {doc.type || '-'}
                    </Td>
                    <Td className="whitespace-nowrap text-gray-900">
                      {doc.style || '-'}
                    </Td>
                  </>
                )}
                <Td className="whitespace-nowrap">
                  {taggingFailed ? (
                    <span className="text-sm text-red-700">
                      {taggingJob.error}
                    </span>
                  ) : taggingJob ? (
                    <JobProgress job={taggingJob} />
                  ) : (
                    <div className="flex items-center">
                      <ProgressBar
                        percent={doc.percentCompletion}
                        posPercent={doc.posCompletion}
                      />
                    </div>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-gray-900">
                  {taggingFailed ? (
                    <DismissButton
                      onClick={() => onDismissUploadJob?.(taggingJob.id)}
                    />
                  ) : (
                    <KebabMenu
                      items={[
                        {
                          label: 'Мэтаданыя',
                          icon: <PencilIcon className="w-4 h-4 mr-3" />,
                          href: `/docs/${doc.n}/metadata`,
                        },
                        {
                          label: 'Сьцягнуць',
                          icon: <DownloadIcon className="w-4 h-4 mr-3" />,
                          onClick: () =>
                            window.open(
                              `/api/registry-files/${doc.n}/download`,
                              '_blank'
                            ),
                        },
                        {
                          label: 'Разьмеціць Stanza',
                          icon: <SparklesIcon className="w-4 h-4 mr-3" />,
                          onClick: () => onTag?.(doc.n),
                          hidden: !stanzaEnabled || !isEditor || !!taggingJob,
                        },
                        {
                          label: 'Абнавіць',
                          icon: <RefreshIcon className="w-4 h-4 mr-3" />,
                          onClick: () => onRefresh?.(doc.n),
                          hidden: !isAdmin,
                        },
                      ]}
                    />
                  )}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
};
