import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { DocumentHeader } from '@/app/docs/types';
import { Roles } from '@/app/auth/types';

interface DocumentsTableProps {
  documents: DocumentHeader[];
  isExpanded: boolean;
  onRefresh?: (documentId: number) => void;
  onRefreshList?: () => void;
  userRole?: Roles;
}

export const DocumentsTable = ({ documents, isExpanded, onRefresh, onRefreshList, userRole }: DocumentsTableProps) => {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [headerMenuPos, setHeaderMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenu !== null) {
        setOpenMenu(null);
      }
      if (headerMenuOpen) {
        setHeaderMenuOpen(false);
      }
    };

    const handleScroll = () => {
      if (openMenu !== null) {
        setOpenMenu(null);
      }
      if (headerMenuOpen) {
        setHeaderMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    window.addEventListener('resize', handleScroll);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [openMenu, headerMenuOpen]);

  const handleDownload = (documentId: number) => {
    window.open(`/api/registry-files/${documentId}/download`, '_blank');
  };

  const handleMenuClick = (event: React.MouseEvent, docId: number) => {
    event.stopPropagation();
    if (openMenu === docId) {
      setOpenMenu(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX
      });
      setOpenMenu(docId);
    }
  };

  const handleMenuActionClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenMenu(null);
  };

  const handleHeaderMenuClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (headerMenuOpen) {
      setHeaderMenuOpen(false);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setHeaderMenuPos({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX
      });
      setHeaderMenuOpen(true);
    }
  };

  const handleHeaderMenuActionClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setHeaderMenuOpen(false);
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Корпус
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
              {userRole === Roles.Admin && (
                <div className="relative">
                  <button
                    onClick={handleHeaderMenuClick}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-150 p-1 rounded-full hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  {headerMenuOpen && typeof document !== 'undefined' && createPortal(
                    <div
                      className="absolute w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200"
                      style={{
                        top: `${(headerMenuPos?.top || 0) + 8}px`,
                        left: `${headerMenuPos?.left || 0}px`,
                        transform: 'translateX(-100%)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="py-1">
                        <button
                          onClick={(event) => {
                            handleHeaderMenuActionClick(event);
                            onRefreshList?.();
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Абнавіць сьпіс
                        </button>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              )}
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
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {doc.corpus || '-'}
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
                  <button
                    onClick={(event) => handleMenuClick(event, doc.n)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-150 p-1 rounded-full hover:bg-gray-100"
                    title="Дзеяньні"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>

                  {openMenu === doc.n && typeof document !== 'undefined' && createPortal(
                    <div
                      className="absolute w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200"
                      style={{
                        top: `${(menuPos?.top || 0) + 8}px`,
                        left: `${menuPos?.left || 0}px`,
                        transform: 'translateX(-100%)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="py-1">
                        <Link
                          href={`/docs/${doc.n}/metadata`}
                          onClick={handleMenuActionClick}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Мэтаданыя
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
                        {userRole === Roles.Admin && (
                          <button
                            onClick={(event) => {
                              handleMenuActionClick(event);
                              onRefresh?.(doc.n);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Абнавіць
                          </button>
                        )}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
