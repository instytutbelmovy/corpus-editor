import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
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

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { containerRef, isReady, getToken, resetToken } =
    useTurnstile('forgot_password');

  useEffect(() => {
    if (router.isReady && router.query.email) {
      setEmail(router.query.email as string);
    }
  }, [router.isReady, router.query.email]);

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

      await serviceLocator.authService.forgotPassword(email, turnstileToken);
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
        title="Email адпраўлены"
        subtitle="Праверце сваю пошту для аднаўленьня паролю"
      >
        <Alert kind="success">
          Інструкцыі аднаўленьня паролю адпраўленыя на {email}
        </Alert>

        <div className="mt-6">
          <Link
            href="/sign-in"
            className={`${buttonClasses('ghost')} w-full text-blue-600 bg-blue-50 hover:bg-blue-100`}
          >
            Вярнуцца да ўваходу
          </Link>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      title="Аднаўленьне паролю"
      subtitle="Увядзіце email для аднаўленьня паролю"
    >
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

        {error && <Alert>{error}</Alert>}

        <div ref={containerRef} />

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          loadingText="Адпраўка..."
        >
          Адправіць спасылку
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
