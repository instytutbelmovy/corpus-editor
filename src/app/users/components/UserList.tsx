import { EditorUserDto } from '../types';
import { getRoleName } from '@/app/auth/types';

interface UserListProps {
  users: EditorUserDto[];
  onEdit: (user: EditorUserDto) => void;
  loading?: boolean;
  openMenu: string | null;
  setOpenMenu: (menu: string | null) => void;
}

export function UserList({ users, onEdit, loading = false, openMenu, setOpenMenu }: UserListProps) {

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Карыстальнікі не знойдзены</p>
      </div>
    );
  }

  const handleMenuClick = (event: React.MouseEvent, userId: string) => {
    event.stopPropagation();
    setOpenMenu(openMenu === userId ? null : userId);
  };

  return (
    <div className="overflow-x-visible">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Імя карыстальніка
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Роля
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr
              key={user.id}
              className={`hover:bg-gray-50 transition-colors duration-150 ${
                user.role === 0 ? 'text-gray-400' : 'text-gray-900'
              }`}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {user.userName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {user.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {getRoleName(user.role)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="relative">
                  <div className="relative inline-block text-left">
                    <button
                      onClick={(event) => handleMenuClick(event, user.id)}
                      className={`transition-colors duration-150 p-1 rounded-full hover:bg-gray-100 ${
                        user.role === 0 ? 'text-gray-300 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title="Дзеянні"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    
                    {openMenu === user.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onEdit(user);
                              setOpenMenu(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Рэдагаваць
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
