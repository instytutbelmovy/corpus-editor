import type { AppProps } from 'next/app';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import '@/app/globals.css';
import { ApiClient } from '@/app/apiClient';
import { AuthService } from '@/app/auth/service';
import { DocumentService } from '@/app/docs/service';
import { UserService } from '@/app/users/service';
import { AuthStorage } from '@/app/auth/storage';
import { useAuthStore } from '@/app/auth/store';
import { useDocumentStore } from '@/app/docs/store';
import { AuthContextType } from '@/app/auth/types';
import { Header } from '@/app/components';
import { isValidReturnUrl } from '@/utils/urlValidation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPages = ['/sign-in', '/forgot-password', '/reset-password'];

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const routerRef = useRef(router);
  const hasCheckedAuth = useRef(false);

  // Выкарыстоўваем store замест локальнага стану
  const { 
    isAuthenticated,
    isLoading,
    authService,
    signIn: storeSignIn,
    signOut: storeSignOut,
    checkAuthStatus,
    setAuthService
  } = useAuthStore();

  const { setDocumentService } = useDocumentStore();
  const [userService, setUserService] = useState<UserService | null>(null);

  // Абнаўляем ref пры змене router
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Функцыя для перанакіроўкі на ўваход з захаваннем returnTo
  const handleUnauthorizedRef = useRef(() => {
    const currentPath = routerRef.current.asPath;
    if (currentPath.startsWith('/sign-in') || currentPath.includes('returnTo=')) {
      routerRef.current.push('/sign-in');
    } else {
      // Правяраем лякальнасць URL перад захаваннем
      if (isValidReturnUrl(currentPath)) {
        const returnTo = `?returnTo=${encodeURIComponent(currentPath)}`;
        routerRef.current.push(`/sign-in${returnTo}`);
      } else {
        routerRef.current.push('/sign-in');
      }
    }
  });

  // Ініцыялізуем сервісы толькі адзін раз
  useEffect(() => {
    const apiClient = new ApiClient(handleUnauthorizedRef.current);
    const auth = new AuthService(handleUnauthorizedRef.current);
    const docs = new DocumentService(apiClient);
    const users = new UserService(apiClient);
    
    setAuthService(auth);
    setDocumentService(docs);
    setUserService(users);
  }, [setAuthService, setDocumentService]);

  // Правяраем аўтэнтыфікацыю
  useEffect(() => {
    if (!authService || hasCheckedAuth.current) return;

    const checkAuth = async () => {
      hasCheckedAuth.current = true;
      try {
        // Спачатку правяраем localStorage
        const cachedUser = AuthStorage.get();
        if (cachedUser) {
          // Аптымістычна ўсталёўваем як аўтэнтыфікаванага
          useAuthStore.getState().setAuthenticated(true);
          useAuthStore.getState().setLoading(false);
          
          // Потым правяраем на сервере ў фоне
          const serverAuth = await checkAuthStatus();
          if (!serverAuth) {
            // Калі сервер кажа, што не аўтэнтыфікаваны, ачысціць стан
            useAuthStore.getState().setAuthenticated(false);
            hasCheckedAuth.current = false;
          }
        } else {
          // Калі няма кэша ў localStorage, лічым што не аўтэнтыфікаваны
          useAuthStore.getState().setAuthenticated(false);
          useAuthStore.getState().setLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        useAuthStore.getState().setAuthenticated(false);
        useAuthStore.getState().setLoading(false);
      }
    };

    checkAuth();
  }, [authService, checkAuthStatus]);

  const signIn = async (email: string, password: string) => {
    const result = await storeSignIn(email, password);
    if (result.success) {
      // Перанакіроўка на returnTo або галоўную старонку
      const returnTo = router.query.returnTo as string;
      if (returnTo && isValidReturnUrl(decodeURIComponent(returnTo))) {
        router.push(decodeURIComponent(returnTo));
      } else {
        router.push('/');
      }
    }
    return result;
  };

  const signOut = async () => {
    await storeSignOut();
    hasCheckedAuth.current = false;
    router.push('/sign-in');
  };

  const authContextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    authService,
    documentService: useDocumentStore.getState().documentService,
    userService,
  };

  // Перанакіроўка на старонку ўваходу, калі карыстальнік не аўтэнтыфікаваны
  useEffect(() => {
    const isPublicPage = publicPages.includes(router.pathname);
    
    if (!isLoading && !isAuthenticated && !isPublicPage && hasCheckedAuth.current) {
      handleUnauthorizedRef.current();
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {isAuthenticated && !publicPages.includes(router.pathname) && <Header />}
      <Component {...pageProps} />
    </AuthContext.Provider>
  );
}
