import { ButtonLink } from '../Button';
import { PlusIcon } from '../icons';

interface DocumentsListHeaderProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  canUpload: boolean;
}

export const DocumentsListHeader = ({
  isExpanded,
  onToggleExpanded,
  canUpload,
}: DocumentsListHeaderProps) => {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Лінгвістычны рэдактар
        </h1>
        <div className="flex items-center space-x-3">
          <div className="inline-flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Дэталі</span>
            <button
              onClick={onToggleExpanded}
              role="switch"
              aria-checked={isExpanded}
              aria-label="Дэталі"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isExpanded ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                  isExpanded ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {canUpload && (
            <ButtonLink href="/docs/new">
              <PlusIcon className="w-4 h-4 mr-2" />
              Дадаць
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
};
