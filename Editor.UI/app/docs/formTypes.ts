export interface BaseDocumentFormData {
  title: string;
  url?: string;
  publicationDate?: string;
  type?: string;
  style?: string;
  corpus?: string;
}

export interface NewDocumentFormData extends BaseDocumentFormData {
  n: number;
  file: File | null;
}

export type MetadataFormData = BaseDocumentFormData;

export type { FormErrors } from '@/app/types';
