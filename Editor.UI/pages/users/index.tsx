import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { UserList } from '@/app/users/components';
import { EditorUserDto } from '@/app/users/types';
import {
  Button,
  Card,
  CardHeader,
  ErrorScreen,
  LoadingScreen,
  PageShell,
} from '@/app/components';
import { PlusIcon } from '@/app/components/icons';
import { serviceLocator } from '@/app/services/serviceLocator';
import { errorMessage } from '@/app/utils/errors';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<EditorUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    serviceLocator.userService
      .fetchUsers()
      .then(setUsers)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleInviteUser = async (user: EditorUserDto) => {
    try {
      await serviceLocator.userService.inviteUser(user.id);
      alert(`Запрашэньне даслана на ${user.email}`);
    } catch (error) {
      console.error('Памылка пры дасыланьні запрашэньня:', error);
      alert('Не ўдалося даслаць запрашэньне. Паспрабуйце яшчэ раз.');
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <PageShell>
      <Card>
        <CardHeader
          title="Кіраваньне карыстальнікамі"
          actions={
            <Button onClick={() => router.push('/users/new')}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Стварыць карыстальніка
            </Button>
          }
        />
        <UserList
          users={users}
          onEdit={user => router.push(`/users/${user.id}`)}
          onInvite={handleInviteUser}
        />
      </Card>
    </PageShell>
  );
}
