import { useState } from 'react';
import { EditorUserCreateDto, FormErrors } from '../types';
import { Roles, getRoleName } from '@/app/auth/types';

interface UserFormProps {
  initialData: EditorUserCreateDto;
  onSubmit: (data: EditorUserCreateDto) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  errors: FormErrors;
  submitButtonText: string;
  loadingButtonText: string;
  title: string;
  subtitle?: string;
}

export function UserForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  errors,
  submitButtonText,
  loadingButtonText,
  title,
  subtitle,
}: UserFormProps) {
  const [formData, setFormData] = useState<EditorUserCreateDto>(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (field: keyof EditorUserCreateDto) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'role' ? Number(e.target.value) as Roles : e.target.value,
    }));
  };

  const roleOptions = Object.values(Roles)
    .filter(value => typeof value === 'number')
    .map(role => ({
      value: role as number,
      label: getRoleName(role as number),
    }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-2 sm:px-2 lg:px-4 pt-4 pb-8">
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
            {/* Памылка адпраўкі */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Імя карыстальніка */}
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
                Імя карыстальніка *
              </label>
              <input
                id="userName"
                name="userName"
                type="text"
                required
                value={formData.userName}
                onChange={handleChange('userName')}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.userName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Увядзіце імя карыстальніка"
              />
              {errors.userName && (
                <p className="mt-1 text-sm text-red-600">{errors.userName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange('email')}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Увядзіце email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Роля */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Роля *
              </label>
              <select
                id="role"
                name="role"
                required
                value={formData.role}
                onChange={handleChange('role')}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.role ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {roleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
            </div>

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
