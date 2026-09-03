import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DocumentForm } from '@/app/docs/components';
import { MetadataFormData, FormErrors } from '@/app/docs/formTypes';
import { DocumentHeader } from '@/app/docs/types';
import { LoadingScreen, ErrorScreen } from '@/app/components';
import { serviceLocator } from '@/app/services/serviceLocator';
import { errorMessage } from '@/app/utils/errors';

export default function EditMetadata() {
  const router = useRouter();
  const { id } = router.query;
  const [header, setHeader] = useState<DocumentHeader | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (typeof id !== 'string') return;

    serviceLocator.documentService
      .fetchDocumentMetadata(Number(id))
      .then(setHeader)
      .catch(err => setLoadError(errorMessage(err)));
  }, [id]);

  const handleSubmit = async (data: MetadataFormData) => {
    setSaving(true);
    try {
      await serviceLocator.documentService.updateMetadata(Number(id), data);
      router.push('/');
    } catch (err) {
      setErrors({ submit: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return <ErrorScreen error={loadError} title="Памылка" />;
  }

  if (!header) {
    return <LoadingScreen message="Загрузка дакумэнта..." />;
  }

  return (
    <DocumentForm
      initialData={header}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/')}
      isSubmitting={saving}
      errors={errors}
      showFileUpload={false}
      showDocumentId={false}
      submitButtonText="Захаваць зьмены"
      loadingButtonText="Захаваньне..."
      title="Рэдагаваць мэтаданыя"
      subtitle={`Дакумэнт #${header.n} • Прагрэс: ${header.percentCompletion}%`}
    />
  );
}
