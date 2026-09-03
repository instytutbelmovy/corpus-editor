import { useState, useEffect } from 'react';
import {
  BaseDocumentFormData,
  NewDocumentFormData,
  MetadataFormData,
  FormErrors,
} from '../formTypes';
import { serviceLocator } from '@/app/services/serviceLocator';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  ComboboxInput,
  Field,
  PageShell,
  TextInput,
} from '@/app/components';
import { FileIcon, UploadIcon } from '@/app/components/icons';

interface DocumentFormProps<T extends NewDocumentFormData | MetadataFormData> {
  initialData: T;
  onSubmit: (data: T) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  errors: FormErrors;
  showFileUpload?: boolean;
  showDocumentId?: boolean;
  submitButtonText: string;
  loadingButtonText: string;
  title: string;
  subtitle?: string;
}

const ALLOWED_FILE_TYPES = ['.docx', '.odt', '.txt', '.epub'];

export function DocumentForm<T extends NewDocumentFormData | MetadataFormData>({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  errors: externalErrors,
  showFileUpload = false,
  showDocumentId = false,
  submitButtonText,
  loadingButtonText,
  title,
  subtitle,
}: DocumentFormProps<T>) {
  const [formData, setFormData] = useState<T>(initialData);
  const [validationErrors, setValidationErrors] = useState<FormErrors>({});
  const [lookups, setLookups] = useState({
    types: [] as string[],
    styles: [] as string[],
    corpora: [] as string[],
  });

  useEffect(() => {
    serviceLocator.documentService
      .fetchLookups()
      .then(setLookups)
      .catch(err => console.error('Не ўдалося загрузіць даведнікі:', err));
  }, []);

  const setField = (
    field: keyof BaseDocumentFormData | 'n' | 'file',
    value: string | number | File | null | undefined
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Ачышчаем памылку, як толькі карыстальнік правіць поле
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (showDocumentId && 'n' in formData && (!formData.n || formData.n <= 0)) {
      newErrors.n = 'Нумар дакумэнта павінен быць дадатным лікам';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Назва дакумэнта абавязковая';
    }

    if (showFileUpload && 'file' in formData) {
      if (!formData.file) {
        newErrors.file = 'Выберыце файл для загрузкі';
      } else {
        const name = formData.file.name.toLowerCase();
        const extension = name.substring(name.lastIndexOf('.'));
        if (!ALLOWED_FILE_TYPES.includes(extension)) {
          newErrors.file =
            'Падтрымліваюцца толькі файлы .docx, .odt, .txt, .epub';
        }
      }
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const errors = { ...externalErrors, ...validationErrors };

  return (
    <PageShell width="narrow">
      <Card>
        <CardHeader title={title} subtitle={subtitle} onClose={onCancel} />

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {errors.submit && <Alert>{errors.submit}</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showDocumentId && (
              <TextInput
                id="n"
                type="number"
                label="Нумар дакумэнта"
                required
                value={'n' in formData ? formData.n || '' : ''}
                error={errors.n}
                onChange={e => setField('n', parseInt(e.target.value) || 0)}
                placeholder="Увядзіце нумар дакумэнта"
              />
            )}

            <TextInput
              id="publicationDate"
              type="text"
              label="Год публікацыі"
              value={formData.publicationDate || ''}
              error={errors.publicationDate}
              onChange={e =>
                setField('publicationDate', e.target.value || undefined)
              }
              placeholder="2024"
              pattern="[0-9]{4}"
              title="Увядзіце год у фармаце YYYY"
            />
          </div>

          <TextInput
            id="title"
            type="text"
            label="Назва"
            required
            value={formData.title}
            error={errors.title}
            onChange={e => setField('title', e.target.value)}
            placeholder="Увядзіце назву дакумэнта"
          />

          <TextInput
            id="url"
            type="url"
            label="Спасылка"
            value={formData.url || ''}
            onChange={e => setField('url', e.target.value)}
            placeholder="https://example.com"
          />

          <ComboboxInput
            id="type"
            label="Тып тэксту"
            value={formData.type || ''}
            options={lookups.types}
            error={errors.type}
            onChange={value => setField('type', value)}
            placeholder="Выберыце або ўвядзіце тып тэксту"
          />

          <ComboboxInput
            id="style"
            label="Стыль"
            value={formData.style || ''}
            options={lookups.styles}
            onChange={value => setField('style', value)}
            placeholder="Выберыце або ўвядзіце стыль"
          />

          <ComboboxInput
            id="corpus"
            label="Корпус"
            value={formData.corpus || ''}
            options={lookups.corpora}
            onChange={value => setField('corpus', value)}
            placeholder="Выберыце або ўвядзіце корпус"
          />

          {showFileUpload && (
            <Field label="Файл дакумэнта" required error={errors.file}>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <UploadIcon />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Загрузіць файл</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept={ALLOWED_FILE_TYPES.join(',')}
                        onChange={event =>
                          setField('file', event.target.files?.[0] || null)
                        }
                      />
                    </label>
                    <p className="pl-1">або перацягніце</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    DOCX, ODT, TXT, EPUB да 10MB
                  </p>
                </div>
              </div>
              {'file' in formData && formData.file && (
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <FileIcon />
                  {formData.file.name}
                </div>
              )}
            </Field>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Скасаваць
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              loadingText={loadingButtonText}
            >
              {submitButtonText}
            </Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
