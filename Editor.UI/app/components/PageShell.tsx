import { ReactNode } from 'react';
import { CloseIcon } from './icons';

interface PageShellProps {
  // wide - сьпісы і рэдактар, narrow - формы
  width?: 'wide' | 'narrow';
  // Расьцягвае старонку і карту на ўсю вышыню (рэдактар дакумэнта)
  fullHeight?: boolean;
  children: ReactNode;
}

export function PageShell({
  width = 'wide',
  fullHeight = false,
  children,
}: PageShellProps) {
  return (
    <div
      className={`min-h-screen bg-gray-50 ${fullHeight ? 'flex flex-col' : ''}`}
    >
      <div
        className={`${width === 'wide' ? 'max-w-7xl' : 'max-w-4xl'} mx-auto px-2 sm:px-2 lg:px-4 pt-4 pb-8 w-full ${
          fullHeight ? 'flex-1 flex flex-col' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function Card({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onClose?: () => void;
}

export function CardHeader({
  title,
  subtitle,
  actions,
  onClose,
}: CardHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions}
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
            title="Закрыць"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}

// Старонкі ўваходу / аднаўленьня паролю
interface AuthPageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthPageLayout({
  title,
  subtitle,
  children,
}: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
