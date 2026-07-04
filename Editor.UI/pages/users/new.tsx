import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../_app';
import { UserForm } from '@/app/users/components';
import { EditorUserCreateDto, FormErrors } from '@/app/users/types';
import { Roles } from '@/app/auth/types';

export default function NewUserPage() {
  const { userService } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const initialData: EditorUserCreateDto = {
    userName: '',
    email: '',
    role: Roles.Viewer,
  };

  const handleSubmit = async (data: EditorUserCreateDto) => {
    if (!userService) {
      setFormErrors({ submit: 'Сэрвіс не ініцыялізаваны' });
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      await userService.createUser(data);
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

  return (
    <UserForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
      errors={formErrors}
      submitButtonText="Стварыць карыстальніка"
      loadingButtonText="Стварэньне..."
      title="Стварыць новага карыстальніка"
      subtitle="Запоўніце інфармацыю пра новага карыстальніка"
    />
  );
}
