import Link from 'next/link';
import { DocumentHeader as DocumentHeaderType } from '../types';

interface DocumentHeaderProps {
  header: DocumentHeaderType;
}

export function DocumentHeader({ header }: DocumentHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150 text-sm"
        >
          ← Назад
        </Link>
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
