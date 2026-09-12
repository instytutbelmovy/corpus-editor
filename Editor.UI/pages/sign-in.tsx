import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuthStore } from '@/app/auth/store';
import { AuthStorage } from '@/app/auth/storage';
import { getSafeReturnTo } from '@/app/utils/urlValidation';
import { useTurnstile } from '@/app/hooks/useTurnstile';
import { configService } from '@/app/services/configService';
import { Alert, AuthPageLayout, Button, TextInput } from '@/app/components';
import { GoogleIcon } from '@/app/components/icons';

// Коды памылак, зь якімі бэкенд перанакіроўвае сюды пасьля няўдалага ўваходу праз Google
const REDIRECT_ERRORS: Record<string, string> = {
  google:
    'Не ўдалося ўвайсьці праз Google. Паспрабуйце яшчэ раз ці скарыстайцеся email і паролем.',
  'no-access':
    'Гэты акаўнт Google ня мае доступу да сыстэмы. Зьвярнецеся да адміністратара, каб атрымаць доступ.',
};

export default function SignIn() {
  const { signIn, checkAuthStatus } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleSignInEnabled, setGoogleSignInEnabled] = useState(false);
  const router = useRouter();
  const { containerRef, isReady, getToken, resetToken } =
    useTurnstile('signin');
  const safeReturnTo = getSafeReturnTo(router.query);

  useEffect(() => {
    configService
      .getConfig()
      .then(config => setGoogleSignInEnabled(config.googleSignInEnabled))
      .catch(() => setGoogleSignInEnabled(false));
  }, []);

  useEffect(() => {
    const code = router.query.error;
    const message =
      typeof code === 'string' ? REDIRECT_ERRORS[code] : undefined;
    if (message) setError(message);
  }, [router.query.error]);

  const googleSignInHref = safeReturnTo
    ? `/api/auth/google/login?returnTo=${encodeURIComponent(safeReturnTo)}`
    : '/api/auth/google/login';

  // Калі ёсьць лакальны кэш - правяраем сэсію на сэрвэры і, калі яна жывая, ідзем далей.
  // Чакаем router.isReady: да яго query пусты і returnTo быў бы згублены.
  useEffect(() => {
    if (!router.isReady || !AuthStorage.get()) return;

    let cancelled = false;
    checkAuthStatus().then(isAuthenticated => {
      if (cancelled) return;
      if (isAuthenticated) {
        router.push(safeReturnTo ?? '/');
      } else {
        setEmail('');
        setPassword('');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, safeReturnTo, checkAuthStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let turnstileToken: string | null = null;
      if (isReady) {
        turnstileToken = getToken();
        if (!turnstileToken) {
          setError('Завяршыце праверку Turnstile');
          return;
        }
      }

      const result = await signIn(email, password, turnstileToken);
      if (result.success) {
        router.push(safeReturnTo ?? '/');
      } else {
        resetToken();
        setError(result.message || 'Памылка ўваходу');
      }
    } catch {
      resetToken();
      setError('Памылка злучэньня з сэрвэрам');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageLayout title="Уваход у сыстэму" subtitle="Лінгвістычны рэдактар">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <TextInput
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
        />

        <TextInput
          id="password"
          name="password"
          type="password"
          label="Пароль"
          autoComplete="current-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Ваш пароль"
        />

        {error && <Alert>{error}</Alert>}

        <div ref={containerRef} />

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          loadingText="Уваход..."
        >
          Увайсьці
        </Button>

        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Забылі пароль?
          </Link>
        </div>
      </form>

      {googleSignInEnabled && (
        <>
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">або</span>
            </div>
          </div>

          <div className="mt-6">
            <a
              href={googleSignInHref}
              className="w-full inline-flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <GoogleIcon />
              Увайсьці праз Google
            </a>
          </div>
        </>
      )}
    </AuthPageLayout>
  );
}
