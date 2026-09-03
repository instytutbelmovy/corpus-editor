import type { AppProps } from 'next/app';
import Router, { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import '@/app/globals.css';
import { useAuthStore } from '@/app/auth/store';
import { Header } from '@/app/components';
import { isValidReturnUrl } from '@/app/utils/urlValidation';
import { configService, FrontendConfig } from '@/app/services/configService';
import { serviceLocator } from '@/app/services/serviceLocator';
import * as Sentry from '@sentry/react';

const publicPages = ['/sign-in', '/forgot-password', '/reset-password'];

// Перанакіраваньне на ўваход, з захаваньнем returnTo пры страце сэсіі (але не пасьля яўнага выхаду - гл. explicitSignOut).
// Рэгіструецца пры загрузцы модуля, бо эфэкты дачэрніх старонак (і іх запыты) выконваюцца раней за эфэкты _app.
function redirectToSignIn(preserveReturnTo = true) {
  const currentPath = Router.asPath;
  const keepReturnTo =
    preserveReturnTo &&
    !currentPath.startsWith('/sign-in') &&
    !currentPath.includes('returnTo=') &&
    isValidReturnUrl(currentPath);
  Router.push(
    keepReturnTo
      ? `/sign-in?returnTo=${encodeURIComponent(currentPath)}`
      : '/sign-in'
  );
}

serviceLocator.setUnauthorizedHandler(redirectToSignIn);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading,
    explicitSignOut,
    checkAuthStatus,
    hydrateFromCache,
  } = useAuthStore();
  const authCheckStarted = useRef(false);
  const isPublicPage = publicPages.includes(router.pathname);

  useEffect(() => {
    if (authCheckStarted.current) return;
    authCheckStarted.current = true;

    hydrateFromCache();
    // Заўсёды правяраем на сэрвэры: сэсія можа быць усталяваная і бяз лакальнага кэшу
    // (напр. пасьля рэдырэкту з Google sign-in, дзе кука ставіцца бэкендам напрамую)
    checkAuthStatus();

    configService.getConfig().then(initSentry);
  }, [checkAuthStatus, hydrateFromCache]);

  // Перанакіроўка на старонку ўваходу, калі карыстальнік не аўтэнтыфікаваны
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicPage) {
      redirectToSignIn(!explicitSignOut);
      if (explicitSignOut) useAuthStore.setState({ explicitSignOut: false });
    }
  }, [isAuthenticated, isLoading, isPublicPage, explicitSignOut]);

  return (
    <>
      {isAuthenticated && !isPublicPage && <Header />}
      <Component {...pageProps} />
    </>
  );
}

function initSentry({ sentryDsn, environment, version }: FrontendConfig) {
  if (environment !== 'development') {
    Sentry.init({
      dsn: sentryDsn,
      sendDefaultPii: false,
      environment,
      release: version,
    });
  }
}
