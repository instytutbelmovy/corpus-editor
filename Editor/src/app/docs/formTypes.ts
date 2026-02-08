export interface BaseDocumentFormData {
  title: string;
  url?: string;
  publicationDate?: string;
  textType: 'вусны' | 'пісьмовы';
  style?: 'публіцыстычны' | 'мастацкі' | 'афіцыйна-справавы' | 'навуковы' | 'гутарковы';
  corpus?: string;
}

export interface NewDocumentFormData extends BaseDocumentFormData {
  n: number;
  file: File | null;
}

export type MetadataFormData = BaseDocumentFormData;

export interface FormErrors {
  [key: string]: string;
}

export const textTypeOptions = [
  { value: 'вусны', label: 'Вусны' },
  { value: 'пісьмовы', label: 'Пісьмовы' }
] as const;

export const styleOptions = [
  { value: 'публіцыстычны', label: 'Публіцыстычны' },
  { value: 'мастацкі', label: 'Мастацкі' },
  { value: 'афіцыйна-справавы', label: 'Афіцыйна-справавы' },
  { value: 'навуковы', label: 'Навуковы' },
  { value: 'гутарковы', label: 'Гутарковы' }
] as const;
