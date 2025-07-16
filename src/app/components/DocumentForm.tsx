import { useState } from 'react';
import { 
  BaseDocumentFormData, 
  NewDocumentFormData, 
  MetadataFormData,
  FormErrors,
  textTypeOptions, 
  styleOptions 
} from '@/types/documentForm';

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

export default function DocumentForm<T extends NewDocumentFormData | MetadataFormData>({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  errors,
  showFileUpload = false,
  showDocumentId = false,
  submitButtonText,
  loadingButtonText,
  title,
  subtitle
}: DocumentFormProps<T>) {
  const [formData, setFormData] = useState<T>(initialData);

  const handleInputChange = (field: keyof BaseDocumentFormData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      // Clear error when user starts typing
      const newErrors = { ...errors };
      delete newErrors[field];
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, file }));
    if (errors.file) {
      const newErrors = { ...errors };
      delete newErrors.file;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (showDocumentId && 'n' in formData && (!formData.n || formData.n <= 0)) {
      newErrors.n = 'Нумар дакумента павінен быць дадатным лікам';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Назва дакумента абавязковая';
    }

    if (showFileUpload && 'file' in formData) {
      if (!formData.file) {
        newErrors.file = 'Выберыце файл для загрузкі';
      } else {
        const allowedTypes = ['.docx', '.txt', '.epub'];
        const fileExtension = formData.file.name.toLowerCase().substring(formData.file.name.lastIndexOf('.'));
        if (!allowedTypes.includes(fileExtension)) {
          newErrors.file = 'Падтрымліваюцца толькі файлы .docx, .txt, .epub';
        }
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Загаловак */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-gray-500">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Нумар дакумента і год публікацыі */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Нумар дакумента */}
              {showDocumentId && (
                <div>
                  <label htmlFor="n" className="block text-sm font-medium text-gray-700 mb-2">
                    Нумар дакумента *
                  </label>
                  <input
                    type="number"
                    id="n"
                    value={'n' in formData ? formData.n || '' : ''}
                    onChange={(e) => handleInputChange('n' as keyof BaseDocumentFormData, parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.n ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Увядзіце нумар дакумента"
                  />
                  {errors.n && (
                    <p className="mt-1 text-sm text-red-600">{errors.n}</p>
                  )}
                </div>
              )}

              {/* Год публікацыі */}
              <div>
                <label htmlFor="publicationDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Год публікацыі
                </label>
                <input
                  type="number"
                  id="publicationDate"
                  value={formData.publicationDate || ''}
                  onChange={(e) => handleInputChange('publicationDate', parseInt(e.target.value) || undefined)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.publicationDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="2024"
                  min="1900"
                  max={new Date().getFullYear()}
                />
                {errors.publicationDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.publicationDate}</p>
                )}
              </div>
            </div>

            {/* Назва */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Назва *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Увядзіце назву дакумента"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Спасылка */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Спасылка
              </label>
              <input
                type="url"
                id="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
              />
            </div>

            {/* Тып тэксту */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тып тэксту *
              </label>
              <div className="space-y-2">
                {textTypeOptions.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="radio"
                      name="textType"
                      value={option.value}
                      checked={formData.textType === option.value}
                      onChange={(e) => handleInputChange('textType', e.target.value as 'вусны' | 'пісьмовы')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Стыль */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Стыль
              </label>
              <select
                value={formData.style || ''}
                onChange={(e) => handleInputChange('style', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Выберыце стыль</option>
                {styleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Файл */}
            {showFileUpload && (
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                  Файл дакумента *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
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
                          accept=".docx,.txt,.epub"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">або перацягніце</p>
                    </div>
                    <p className="text-xs text-gray-500">DOCX, TXT, EPUB да 10MB</p>
                  </div>
                </div>
                {'file' in formData && formData.file && (
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    {formData.file.name}
                  </div>
                )}
                {errors.file && (
                  <p className="mt-1 text-sm text-red-600">{errors.file}</p>
                )}
              </div>
            )}

            {/* Кнопкі */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Скасаваць
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? loadingButtonText : submitButtonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 