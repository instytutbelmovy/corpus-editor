import { useAuthStore } from '@/app/auth/store';
import { getRoleName } from '@/app/auth/types';

export default function Header() {
  const { user, signOut } = useAuthStore();

  if (!user) {
    return null;
  }

  return (
    <header className="max-w-7xl mx-auto px-2 sm:px-2 lg:px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 flex justify-end items-center">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">{getRoleName(user.role)}</span>
          <button
            onClick={signOut}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Выйсьці
          </button>
        </div>
      </div>
    </header>
  );
}
