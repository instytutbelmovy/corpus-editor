import { EditorUserDto } from '../types';
import { getRoleName, Roles } from '@/app/auth/types';
import { KebabMenu, Table, Tbody, Td, Th, Thead, Tr } from '@/app/components';
import { PencilIcon } from '@/app/components/icons';

interface UserListProps {
  users: EditorUserDto[];
  onEdit: (user: EditorUserDto) => void;
  onInvite: (user: EditorUserDto) => void;
}

export function UserList({ users, onEdit, onInvite }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Карыстальнікі не знойдзены</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-visible">
      <Table>
        <Thead>
          <Th>Імя карыстальніка</Th>
          <Th>Email</Th>
          <Th>Роля</Th>
          <Th />
        </Thead>
        <Tbody>
          {users.map(user => {
            // Нэактыўныя карыстальнікі паказваюцца прыглушана
            const isInactive = user.role === Roles.None;

            return (
              <Tr
                key={user.id}
                className={isInactive ? 'text-gray-400' : 'text-gray-900'}
              >
                <Td className="whitespace-nowrap font-medium">
                  {user.userName}
                </Td>
                <Td className="whitespace-nowrap">{user.email}</Td>
                <Td className="whitespace-nowrap">{getRoleName(user.role)}</Td>
                <Td className="whitespace-nowrap">
                  <KebabMenu
                    buttonClassName={
                      isInactive
                        ? 'text-gray-300 hover:text-gray-400'
                        : 'text-gray-400 hover:text-gray-600'
                    }
                    items={[
                      {
                        label: 'Рэдагаваць',
                        icon: <PencilIcon className="w-4 h-4 mr-3" />,
                        onClick: () => onEdit(user),
                      },
                      {
                        label: 'Даслаць запрашэньне',
                        icon: <span className="mr-3">✉</span>,
                        onClick: () => onInvite(user),
                        hidden: isInactive,
                      },
                    ]}
                  />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
}
