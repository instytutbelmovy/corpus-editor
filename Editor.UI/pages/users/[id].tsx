import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { UserForm } from '@/app/users/components';
import {
  EditorUserDto,
  EditorUserCreateDto,
  FormErrors,
} from '@/app/users/types';
import { LoadingScreen, ErrorScreen } from '@/app/components';
import { serviceLocator } from '@/app/services/serviceLocator';
import { errorMessage } from '@/app/utils/errors';

export default function EditUserPage() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<EditorUserDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Бэкенд ня мае GET /users/{id} — шукаем карыстальніка ў поўным сьпісе
  useEffect(() => {
    if (typeof id !== 'string') return;

    serviceLocator.userService
      .fetchUsers()
      .then(users => {
        const found = users.find(u => u.id === id);
        if (found) {
          setUser(found);
        } else {
          setLoadError('Карыстальнік не знойдзены');
        }
      })
      .catch(err => setLoadError(errorMessage(err)));
  }, [id]);

  const handleSubmit = async (data: EditorUserCreateDto) => {
    if (typeof id !== 'string') return;

    setIsSubmitting(true);
    setFormErrors({});
    try {
      await serviceLocator.userService.updateUser(id, data);
      router.push('/users');
    } catch (err) {
      setFormErrors({ submit: errorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadError) {
    return <ErrorScreen error={loadError} />;
  }

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <UserForm
      initialData={{
        userName: user.userName,
        email: user.email,
        role: user.role,
      }}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/users')}
      isSubmitting={isSubmitting}
      errors={formErrors}
      submitButtonText="Захаваць зьмены"
      loadingButtonText="Захаваньне..."
      title="Рэдагаваць карыстальніка"
      subtitle={`Рэдагаваньне карыстальніка ${user.userName}`}
    />
  );
}
