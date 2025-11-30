import Link from 'next/link';
import { DocumentHeader as DocumentHeaderType } from '../types';
import { useUIStore } from '../uiStore';
import { useAuthStore } from '@/app/auth/store';
import { Roles } from '@/app/auth/types';

interface DocumentHeaderProps {
  header: DocumentHeaderType;
}

export function DocumentHeader({ header }: DocumentHeaderProps) {
  const { isStructureEditingMode, setIsStructureEditingMode } = useUIStore();
  const { user } = useAuthStore();

  const canEdit = user?.role === Roles.Editor || user?.role === Roles.Admin;

  const handleEnableEdit = () => {
    setIsStructureEditingMode(true);
  };

  const handleCancelEdit = () => {
    setIsStructureEditingMode(false);
  };

  const handleSaveEdit = () => {
    // TODO: Implement save functionality
    console.log('Save structure changes');
    setIsStructureEditingMode(false);
  };

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150 text-sm"
        >
          ← Назад
        </Link>

        <div className="flex items-center gap-2">
          {canEdit && (
            isStructureEditingMode ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                >
                  Захаваць
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Скасаваць
                </button>
              </>
            ) : (
              <button
                onClick={handleEnableEdit}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
              >
                Рэдагаваць тэкст
              </button>
            )
          )}
        </div>
      </div>

      <div className="text-right">
        <h1 className="text-lg font-semibold text-gray-900 max-w-2xl">
          <span className="text-sm text-gray-500">#{header.n}</span>{' '}
          {header.title}
        </h1>
      </div>
    </div>
  );
}
