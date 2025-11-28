import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuthStore } from '@/app/auth/store';
import { isValidReturnUrl } from '@/utils/urlValidation';
import { useRecaptcha } from '@/app/hooks/useRecaptcha';

export default function SignIn() {
  const { authService, signIn: storeSignIn, checkAuthStatus } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { executeRecaptcha, isReady } = useRecaptcha();

  useEffect(() => {
    // Праверка, ці ўжо ўвайшоў карыстальнік
    const checkAuth = async () => {
      if (!authService) return;

      // Спачатку правяраем localStorage, каб пазбегнуць залішніх API выклікаў
      const cachedUser = authService.getCurrentUser();
      if (cachedUser) {
        // Калі ёсць кэш, правяраем на сервере
        const isAuthenticated = await checkAuthStatus();
        if (isAuthenticated) {
          const returnTo = router.query.returnTo as string;
          if (returnTo && isValidReturnUrl(decodeURIComponent(returnTo))) {
            router.push(decodeURIComponent(returnTo));
          } else {
            router.push('/');
          }
        } else {
          // Калі сервер кажа, што не аўтэнтыфікаваны, ачысціць форму
          setEmail('');
          setPassword('');
        }
      }
    };
    checkAuth();
  }, [router, authService, checkAuthStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!authService) {
      setError('Сэрвіс не ініцыялізаваны');
      setIsLoading(false);
      return;
    }

    try {
      // Выконваем reCAPTCHA
      let recaptchaToken: string | null = null;
      if (isReady) {
        recaptchaToken = await executeRecaptcha('signin');
        if (!recaptchaToken) {
          setError('Памылка праверкі reCAPTCHA');
          setIsLoading(false);
          return;
        }
      }

      const result = await storeSignIn(email, password, recaptchaToken);

      if (result.success) {
        const returnTo = router.query.returnTo as string;
        if (returnTo && isValidReturnUrl(decodeURIComponent(returnTo))) {
          router.push(decodeURIComponent(returnTo));
        } else {
          router.push('/');
        }
      } else {
        setError(result.message || 'Памылка ўваходу');
      }
    } catch {
      setError('Памылка злучэньня з серверам');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Уваход у сыстэму
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Лінгвістычны рэдактар
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Пароль
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ваш пароль"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      {error}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Уваход...
                  </div>
                ) : (
                  'Увайсьці'
                )}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Забылі пароль?
              </Link>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
