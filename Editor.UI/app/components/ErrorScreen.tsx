import Link from 'next/link';
import { Card, PageShell } from './PageShell';

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
    <PageShell width="narrow">
      <Card className="p-6">
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
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">{title}</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </Card>
    </PageShell>
  );
}
