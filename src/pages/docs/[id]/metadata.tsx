import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { documentService } from '@/services/documentService';
import { DocumentForm } from '@/app/components';
import { MetadataFormData, FormErrors } from '@/types/documentForm';

export default function EditMetadata() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [documentInfo, setDocumentInfo] = useState<{ n: number; percentCompletion: number } | null>(null);
  const [initialData, setInitialData] = useState<MetadataFormData>({
    title: '',
    url: '',
    publicationDate: undefined,
    textType: 'пісьмовы',
    style: undefined
  });

  useEffect(() => {
    if (id) {
      fetchDocumentData();
    }
  }, [id]);

  const fetchDocumentData = async () => {
    try {
      const data = await documentService.fetchDocumentMetadata(Number(id));
      setDocumentInfo({ n: data.n, percentCompletion: data.percentCompletion });
      setInitialData({
        title: data.title || '',
        url: data.url || '',
        publicationDate: data.publicationDate || '',
        textType: (data.type as 'вусны' | 'пісьмовы') || 'пісьмовы',
        style: data.style as 'публіцыстычны' | 'мастацкі' | 'афіцыйна-справавы' | 'навуковы' | 'гутарковы' | undefined
      });
    } catch (error) {
      setErrors({ fetch: error instanceof Error ? error.message : 'Невядомая памылка' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: MetadataFormData) => {
    setSaving(true);

    try {
      await documentService.updateMetadata(Number(id), {
        title: data.title,
        url: data.url || null,
        publicationDate: data.publicationDate || null,
        type: data.textType,
        style: data.style || ''
      });

      router.push('/');
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Невядомая памылка' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка дакумента...</p>
        </div>
      </div>
    );
  }

  if (errors.fetch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Памылка</div>
          <p className="text-gray-600 mb-4">{errors.fetch}</p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Вярнуцца на галоўную
          </button>
        </div>
      </div>
    );
  }

  return (
    <DocumentForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={saving}
      errors={errors}
      showFileUpload={false}
      showDocumentId={false}
      submitButtonText="Захаваць змены"
      loadingButtonText="Захаванне..."
      title="Рэдагаваць метаданыя"
      subtitle={`Дакумент #${documentInfo?.n} • Прагрэс: ${documentInfo?.percentCompletion}%`}
    />
  );
} 