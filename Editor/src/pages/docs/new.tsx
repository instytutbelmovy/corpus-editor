import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../_app';
import { DocumentForm } from '@/app/docs/components';
import { NewDocumentFormData, FormErrors } from '@/app/docs/formTypes';

export default function NewDocument() {
  const { documentService } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const initialData: NewDocumentFormData = {
    n: 0,
    title: '',
    url: '',
    publicationDate: '',
    textType: 'пісьмовы',
    style: undefined,
    file: null
  };

  const handleSubmit = async (data: NewDocumentFormData) => {
    if (!documentService) {
      setErrors({ submit: 'Сэрвіс не ініцыялізаваны' });
      return;
    }

    setLoading(true);

    try {
      await documentService.createDocument({
        n: data.n,
        title: data.title,
        url: data.url,
        publicationDate: data.publicationDate,
        textType: data.textType,
        style: data.style,
        file: data.file!
      });

      router.push('/');
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Невядомая памылка' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <DocumentForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={loading}
      errors={errors}
      showFileUpload={true}
      showDocumentId={true}
      submitButtonText="Загрузіць дакумэнт"
      loadingButtonText="Загрузка..."
      title="Дадаць новы дакумэнт"
      subtitle="Запоўніце інфармацыю пра дакумэнт і выберыце файл"
    />
  );
} 