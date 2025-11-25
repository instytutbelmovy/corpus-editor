import Link from 'next/link';

interface DocumentsListHeaderProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export const DocumentsListHeader = ({ isExpanded, onToggleExpanded }: DocumentsListHeaderProps) => {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Лінгвістычны рэдактар
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="inline-flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Дэталі</span>
            <button
              onClick={onToggleExpanded}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{
                backgroundColor: isExpanded ? '#3B82F6' : '#D1D5DB'
              }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${isExpanded ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
          <Link
            href="/docs/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Дадаць
          </Link>
        </div>
      </div>
    </div>
  );
};
