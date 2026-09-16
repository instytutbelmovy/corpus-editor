import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/app/auth/store';
import { getRoleName, Roles } from '@/app/auth/types';
import { LogoutIcon } from './icons';
import { buttonClasses } from './Button';

export default function Header() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();

  if (!user) {
    return null;
  }

  // Дакумэнты і граматычная база даступныя ўсім аўтэнтыфікаваным (граматычная база - у рэжыме толькі прагляду для глядачоў); карыстальнікі - толькі адміністратару
  const isAdmin = user.role === Roles.Admin;

  return (
    <header className="max-w-7xl mx-auto px-2 sm:px-2 lg:px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 flex justify-between items-center">
        <div className="flex items-center space-x-1">
          <NavLink
            href="/"
            isActive={
              router.pathname === '/' || router.pathname.startsWith('/docs')
            }
          >
            Дакумэнты
          </NavLink>
          <NavLink
            href="/grammar-base"
            isActive={router.pathname.startsWith('/grammar-base')}
          >
            Граматычная база
          </NavLink>
          {isAdmin && (
            <NavLink
              href="/users"
              isActive={router.pathname.startsWith('/users')}
            >
              Карыстальнікі
            </NavLink>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            {getRoleName(user.role)}
          </span>
          <button
            onClick={signOut}
            className={buttonClasses('secondary', 'sm', 'font-medium')}
          >
            <LogoutIcon />
            Выйсьці
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </Link>
  );
}
