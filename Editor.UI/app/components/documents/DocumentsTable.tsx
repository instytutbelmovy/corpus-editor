import Link from 'next/link';
import {
  DocumentHeader,
  UploadJobStage,
  UploadJobState,
  UploadJobStatus,
} from '@/app/docs/types';
import { Roles } from '@/app/auth/types';
import { KebabMenu } from '../KebabMenu';
import { Table, Tbody, Td, Th, Thead, Tr } from '../Table';
import { DownloadIcon, PencilIcon, RefreshIcon } from '../icons';

interface DocumentsTableProps {
  documents: DocumentHeader[];
  uploadJobs?: UploadJobStatus[];
  recentlyCompletedIds?: Set<number>;
  isExpanded: boolean;
  onRefresh?: (documentId: number) => void;
  onRefreshList?: () => void;
  onDismissUploadJob?: (jobId: string) => void;
  userRole?: Roles;
}

const MAX_URL_LENGTH = 30;

const STAGE_LABELS: Record<UploadJobStage, string> = {
  [UploadJobStage.Queued]: 'У чарзе',
  [UploadJobStage.Parsing]: 'Разбор',
  [UploadJobStage.LookingUpGrammar]: 'Пошук граматыкі',
  [UploadJobStage.Tagging]: 'Тэгаваньне',
  [UploadJobStage.Saving]: 'Захаваньне',
  [UploadJobStage.Done]: 'Гатова',
};

const EXTRA_COLUMN_COUNT = 4; // Дата публікацыі, URL, Тып, Стыль

export const DocumentsTable = ({
  documents,
  uploadJobs = [],
  recentlyCompletedIds = new Set(),
  isExpanded,
  onRefresh,
  onRefreshList,
  onDismissUploadJob,
  userRole,
}: DocumentsTableProps) => {
  const isAdmin = userRole === Roles.Admin;
  const statusColSpan = 1 + (isExpanded ? EXTRA_COLUMN_COUNT : 0);

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
          <Th>
            {isAdmin && (
              <KebabMenu
                items={[
                  {
                    label: 'Абнавіць сьпіс',
                    icon: <RefreshIcon className="w-4 h-4 mr-3" />,
                    onClick: () => onRefreshList?.(),
                  },
                ]}
              />
            )}
          </Th>
        </Thead>
        <Tbody>
          {uploadJobs.map(job => {
            const isFailed = job.state === UploadJobState.Failed;
            const showTokenProgress =
              !isFailed &&
              (job.stage === UploadJobStage.Tagging ||
                job.stage === UploadJobStage.LookingUpGrammar) &&
              job.totalTokens > 0;
            const percent = showTokenProgress
              ? Math.round((job.processedTokens / job.totalTokens) * 100)
              : null;

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
                    <div className="flex items-center">
                      <span className="text-sm text-gray-700 mr-3">
                        {STAGE_LABELS[job.stage]}
                      </span>
                      {percent !== null && (
                        <>
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-900 font-medium">
                            {percent}%
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-gray-900">
                  {isFailed && (
                    <button
                      type="button"
                      onClick={() => onDismissUploadJob?.(job.id)}
                      className="text-gray-500 hover:text-gray-800"
                      aria-label="Прыбраць"
                    >
                      ×
                    </button>
                  )}
                </Td>
              </Tr>
            );
          })}
          {documents.map(doc => (
            <Tr
              key={doc.n}
              className={
                recentlyCompletedIds.has(doc.n)
                  ? 'bg-green-50 transition-colors duration-1000'
                  : 'transition-colors duration-1000'
              }
            >
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
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${doc.percentCompletion}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900 font-medium">
                    {doc.percentCompletion}%
                  </span>
                </div>
              </Td>
              <Td className="whitespace-nowrap text-gray-900">
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
                      label: 'Абнавіць',
                      icon: <RefreshIcon className="w-4 h-4 mr-3" />,
                      onClick: () => onRefresh?.(doc.n),
                      hidden: !isAdmin,
                    },
                  ]}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
};
