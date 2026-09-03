import { useState } from 'react';
import { EditorUserCreateDto, FormErrors } from '../types';
import { Roles, getRoleName } from '@/app/auth/types';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  PageShell,
  SelectInput,
  TextInput,
} from '@/app/components';

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

const roleOptions = Object.values(Roles)
  .filter((value): value is Roles => typeof value === 'number')
  .map(role => ({ value: role, label: getRoleName(role) }));

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

  return (
    <PageShell width="narrow">
      <Card>
        <CardHeader title={title} subtitle={subtitle} onClose={onCancel} />

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {errors.submit && <Alert>{errors.submit}</Alert>}

          <TextInput
            id="userName"
            name="userName"
            type="text"
            label="Імя карыстальніка"
            required
            value={formData.userName}
            error={errors.userName}
            onChange={e =>
              setFormData(prev => ({ ...prev, userName: e.target.value }))
            }
            placeholder="Увядзіце імя карыстальніка"
          />

          <TextInput
            id="email"
            name="email"
            type="email"
            label="Email"
            required
            value={formData.email}
            error={errors.email}
            onChange={e =>
              setFormData(prev => ({ ...prev, email: e.target.value }))
            }
            placeholder="Увядзіце email"
          />

          <SelectInput
            id="role"
            name="role"
            label="Роля"
            required
            value={formData.role}
            error={errors.role}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                role: Number(e.target.value) as Roles,
              }))
            }
          >
            {roleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>

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
