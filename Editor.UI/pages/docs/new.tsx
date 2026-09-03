import { useState } from 'react';
import { useRouter } from 'next/router';
import { DocumentForm } from '@/app/docs/components';
import { NewDocumentFormData, FormErrors } from '@/app/docs/formTypes';
import { serviceLocator } from '@/app/services/serviceLocator';
import { errorMessage } from '@/app/utils/errors';

const initialData: NewDocumentFormData = {
  n: 0,
  title: '',
  url: '',
  publicationDate: '',
  type: undefined,
  style: undefined,
  file: null,
};

export default function NewDocument() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = async (data: NewDocumentFormData) => {
    // Форма валідуе наяўнасьць файла перад адпраўкай
    if (!data.file) return;

    setLoading(true);
    try {
      await serviceLocator.documentService.createDocument({
        ...data,
        file: data.file,
      });
      router.push('/');
    } catch (err) {
      setErrors({ submit: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DocumentForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/')}
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
