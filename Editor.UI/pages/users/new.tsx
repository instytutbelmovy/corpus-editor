import { useState } from 'react';
import { useRouter } from 'next/router';
import { UserForm } from '@/app/users/components';
import { EditorUserCreateDto, FormErrors } from '@/app/users/types';
import { Roles } from '@/app/auth/types';
import { serviceLocator } from '@/app/services/serviceLocator';
import { errorMessage } from '@/app/utils/errors';

const initialData: EditorUserCreateDto = {
  userName: '',
  email: '',
  role: Roles.Viewer,
};

export default function NewUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const handleSubmit = async (data: EditorUserCreateDto) => {
    setIsSubmitting(true);
    setFormErrors({});
    try {
      await serviceLocator.userService.createUser(data);
      router.push('/users');
    } catch (err) {
      setFormErrors({ submit: errorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/users')}
      isSubmitting={isSubmitting}
      errors={formErrors}
      submitButtonText="Стварыць карыстальніка"
      loadingButtonText="Стварэньне..."
      title="Стварыць новага карыстальніка"
      subtitle="Запоўніце інфармацыю пра новага карыстальніка"
    />
  );
}
