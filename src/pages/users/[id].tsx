import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../_app';
import { UserForm } from '@/app/users/components';
import { EditorUserDto, EditorUserCreateDto, FormErrors } from '@/app/users/types';
import { LoadingScreen, ErrorScreen } from '@/app/components';

export default function EditUserPage() {
  const { userService } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<EditorUserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    const fetchUser = async () => {
      if (!userService || !id || typeof id !== 'string') {
        setError('Сэрвіс карыстальнікаў не ініцыялізаваны або ID не зададзены');
        setLoading(false);
        return;
      }

      try {
        const users = await userService.fetchUsers();
        const foundUser = users.find(u => u.id === id);
        
        if (!foundUser) {
          setError('Карыстальнік не знойдзены');
          setLoading(false);
          return;
        }

        setUser(foundUser);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Невядомая памылка');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userService, id]);

  const handleSubmit = async (data: EditorUserCreateDto) => {
    if (!userService || !id || typeof id !== 'string') {
      setFormErrors({ submit: 'Сэрвіс не ініцыялізаваны' });
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      await userService.updateUser(id, data);
      router.push('/users');
    } catch (err) {
      setFormErrors({ 
        submit: err instanceof Error ? err.message : 'Невядомая памылка' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  if (!user) {
    return <ErrorScreen error="Карыстальнік не знойдзены" />;
  }

  const initialData: EditorUserCreateDto = {
    userName: user.userName,
    email: user.email,
    role: user.role,
  };

  return (
    <UserForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
      errors={formErrors}
      submitButtonText="Захаваць змены"
      loadingButtonText="Захаванне..."
      title="Рэдагаваць карыстальніка"
      subtitle={`Рэдагаванне карыстальніка ${user.userName}`}
    />
  );
}
