import Link from 'next/link';

interface ErrorScreenProps {
  error: string;
  title?: string;
  showBackButton?: boolean;
  backHref?: string;
  backText?: string;
}

export function ErrorScreen({
  error,
  title = 'Памылка загрузкі',
  showBackButton = true,
  backHref = '/',
  backText = '← Вярнуцца',
}: ErrorScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-2 sm:px-2 lg:px-4 pt-4 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {showBackButton && (
            <div className="mb-6">
              <Link
                href={backHref}
                className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150 text-sm"
              >
                {backText}
              </Link>
            </div>
          )}
          <div className="text-center py-12">
            <div className="text-red-400 text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">
              {title}
            </h1>
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
