import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTurnstile } from '@/app/hooks/useTurnstile';
import { serviceLocator } from '@/app/services/serviceLocator';
import { errorMessage } from '@/app/utils/errors';
import {
  Alert,
  AuthPageLayout,
  Button,
  buttonClasses,
  TextInput,
} from '@/app/components';

const MIN_PASSWORD_LENGTH = 10;

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const router = useRouter();
  const { containerRef, isReady, getToken, resetToken } =
    useTurnstile('reset_password');

  useEffect(() => {
    const { email: queryEmail, token: queryToken } = router.query;
    if (queryEmail && queryToken) {
      setEmail(queryEmail as string);
      setToken(queryToken as string);
    }
  }, [router.query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Паролі не супадаюць');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль павінен быць ня менш за ${MIN_PASSWORD_LENGTH} сымбаляў`);
      return;
    }

    setIsLoading(true);
    try {
      let turnstileToken: string | null = null;
      if (isReady) {
        turnstileToken = getToken();
        if (!turnstileToken) {
          setError('Заўершыце праверку Turnstile');
          return;
        }
      }

      await serviceLocator.authService.resetPassword(
        email,
        token,
        password,
        turnstileToken
      );
      setIsSuccess(true);
    } catch (err) {
      resetToken();
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthPageLayout
        title="Пароль адноўлены"
        subtitle="Ваш пароль паспяхова адноўлены"
      >
        <Alert kind="success">
          Пароль паспяхова адноўлены. Цяпер вы можаце ўвайсці з новым паролем.
        </Alert>

        <div className="mt-6">
          <Link href="/sign-in" className={`${buttonClasses()} w-full`}>
            Увайсьці ў сыстэму
          </Link>
        </div>
      </AuthPageLayout>
    );
  }

  if (!email || !token) {
    return (
      <AuthPageLayout
        title="Няправільная спасылка"
        subtitle="Спасылка для аднаўленьня паролю няправільная або пратэрмінаваная"
      >
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Запытаць новую спасылку
          </Link>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      title="Усталяваць новы пароль"
      subtitle={`Увядзіце новы пароль для ${email}`}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <TextInput
          id="password"
          name="password"
          type="password"
          label="Новы пароль"
          autoComplete="new-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Новы пароль"
        />

        <TextInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Пацвердзіце пароль"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Пацвердзіце пароль"
        />

        {error && <Alert>{error}</Alert>}

        <div ref={containerRef} />

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          loadingText="Аднаўленьне..."
        >
          Аднавіць пароль
        </Button>

        <div className="text-center">
          <Link
            href="/sign-in"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Вярнуцца да ўваходу
          </Link>
        </div>
      </form>
    </AuthPageLayout>
  );
}
