import type { AppProps } from 'next/app';
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import '@/app/globals.css';
import { AuthService, ApiClient, DocumentService, AuthStorage } from '@/services';
import { AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default function App({ Component, pageProps }: AppProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authService, setAuthService] = useState<AuthService | null>(null);
  const [documentService, setDocumentService] = useState<DocumentService | null>(null);
  const router = useRouter();
  const routerRef = useRef(router);
  const hasCheckedAuth = useRef(false);

  // Абнаўляем ref пры змене router
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Функцыя для перанакіроўкі на ўваход з захаваннем returnTo
  const handleUnauthorizedRef = useRef(() => {
    const currentPath = routerRef.current.asPath;
    // Правяраем, ці ўжо мы на старонцы ўваходу або ўжо ёсць returnTo
    if (currentPath.startsWith('/sign-in') || currentPath.includes('returnTo=')) {
      routerRef.current.push('/sign-in');
    } else {
      const returnTo = `?returnTo=${encodeURIComponent(currentPath)}`;
      routerRef.current.push(`/sign-in${returnTo}`);
    }
  });

  // Ініцыялізуем сервісы толькі адзін раз
  useEffect(() => {
    const apiClient = new ApiClient(handleUnauthorizedRef.current);
    const auth = new AuthService(handleUnauthorizedRef.current);
    const docs = new DocumentService(apiClient);
    
    setAuthService(auth);
    setDocumentService(docs);
  }, []); // Прыбіраем handleUnauthorized з залежнасцей

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
          setIsAuthenticated(true);
          setIsLoading(false);
          
          // Потым правяраем на сервере ў фоне
          const serverAuth = await authService.checkAuthStatus();
          if (!serverAuth) {
            // Калі сервер кажа, што не аўтэнтыфікаваны, ачысціць стан
            setIsAuthenticated(false);
            hasCheckedAuth.current = false; // Дазволіць пераправерку
          }
        } else {
          // Калі няма кэша ў localStorage, лічым што не аўтэнтыфікаваны
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [authService]);

  const signIn = async (email: string, password: string) => {
    if (!authService) return { success: false, message: 'Сэрвіс не ініцыялізаваны' };
    
    const result = await authService.signIn(email, password);
    if (result.success) {
      setIsAuthenticated(true);
      
      // Перанакіроўка на returnTo або галоўную старонку
      const returnTo = router.query.returnTo as string;
      if (returnTo) {
        router.push(decodeURIComponent(returnTo));
      } else {
        router.push('/');
      }
    }
    return result;
  };

  const signOut = async () => {
    if (!authService) return;
    
    await authService.signOut();
    setIsAuthenticated(false);
    hasCheckedAuth.current = false; // Скідаем флаг для новай праверкі
    router.push('/sign-in');
  };

  const authContextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    authService,
    documentService,
  };

  // Перанакіроўка на старонку ўваходу, калі карыстальнік не аўтэнтыфікаваны
  useEffect(() => {
    if (!isLoading && !isAuthenticated && router.pathname !== '/sign-in' && hasCheckedAuth.current) {
      handleUnauthorizedRef.current();
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <AuthContext.Provider value={authContextValue}>
      <Component {...pageProps} />
    </AuthContext.Provider>
  );
}
