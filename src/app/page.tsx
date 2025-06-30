'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { documentService } from '@/services';
import { LoadingScreen, ErrorScreen } from '@/components';

interface Document {
  id: number;
  title: string;
  percentCompletion: number;
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const data = await documentService.fetchDocuments();
        setDocuments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Невядомая памылка');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  if (loading) {
    return <LoadingScreen message="Загрузка дакумэнтаў..." />;
  }

  if (error) {
    return <ErrorScreen error={error} title="Памылка" showBackButton={false} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Дакумэнты</h1>
            <p className="mt-1 text-sm text-gray-500">
              Сьпіс дакумэнтаў для разьметкі
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    №
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Назва
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Разьмечана %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map(doc => (
                  <tr
                    key={doc.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {doc.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <Link
                        href={`/docs/${doc.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150"
                      >
                        {doc.title}
                      </Link>
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {documents.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Дакумэнты не знойдзены
              </h3>
              <p className="text-gray-500">
                Пакуль што няма дакумэнтаў для разьметкі
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
