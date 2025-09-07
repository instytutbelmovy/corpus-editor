import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../_app';
import { UserList } from '@/app/users/components';
import { EditorUserDto } from '@/app/users/types';
import { LoadingScreen, ErrorScreen } from '@/app/components';

export default function UsersPage() {
  const { userService } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<EditorUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!userService) {
      return; // Не выклікаем fetchUsers, калі userService яшчэ не ініцыялізаваны
    }

    const fetchUsers = async () => {
      try {
        const usersData = await userService.fetchUsers();
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Невядомая памылка');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userService]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenu !== null) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenu]);

  const handleEditUser = (user: EditorUserDto) => {
    router.push(`/users/${user.id}`);
  };

  const handleCreateUser = () => {
    router.push('/users/new');
  };

  if (!userService) {
    return <LoadingScreen />;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-2 lg:px-4 pt-4 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Загаловак */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Кіраванне карыстальнікамі
                </h1>
              </div>
              <button
                onClick={handleCreateUser}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Стварыць карыстальніка
              </button>
            </div>
          </div>

          {/* Табліца карыстальнікаў */}
          <UserList
            users={users}
            onEdit={handleEditUser}
            loading={loading}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
          />
        </div>
      </div>
    </div>
  );
}
