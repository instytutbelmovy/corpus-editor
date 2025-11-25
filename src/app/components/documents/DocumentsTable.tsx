import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DocumentHeader } from '@/app/docs/types';

interface DocumentsTableProps {
  documents: DocumentHeader[];
  isExpanded: boolean;
}

export const DocumentsTable = ({ documents, isExpanded }: DocumentsTableProps) => {
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenu !== null) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenu]);

  const handleDownload = (documentId: number) => {
    window.open(`/api/registry-files/${documentId}/download`, '_blank');
  };

  const handleMenuClick = (event: React.MouseEvent, docId: number) => {
    event.stopPropagation();
    setOpenMenu(openMenu === docId ? null : docId);
  };

  const handleMenuActionClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenMenu(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Назва
            </th>
            {isExpanded && (
              <>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата публікацыі
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тып
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Стыль
                </th>
              </>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Прагрэс
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.map(doc => (
            <tr
              key={doc.n}
              className="hover:bg-gray-50 transition-colors duration-150"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {doc.n}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                <Link
                  href={`/docs/${doc.n}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150"
                >
                  {doc.title}
                </Link>
              </td>
              {isExpanded && (
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.publicationDate || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {doc.url.length > 30 ? `${doc.url.substring(0, 30)}...` : doc.url}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.type || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.style || '-'}
                  </td>
                </>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${doc.percentCompletion}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-900 font-medium">
                    {doc.percentCompletion}%
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="relative">
                  <div className="relative inline-block text-left">
                    <button
                      onClick={(event) => handleMenuClick(event, doc.n)}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-150 p-1 rounded-full hover:bg-gray-100"
                      title="Дзеянні"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {openMenu === doc.n && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="py-1">
                          <Link
                            href={`/docs/${doc.n}/metadata`}
                            onClick={handleMenuActionClick}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Метаданыя
                          </Link>
                          <button
                            onClick={(event) => {
                              handleMenuActionClick(event);
                              handleDownload(doc.n);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Сьцягнуць
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
