import { DocumentData, ParadigmFormId } from '@/types/document';

interface DocumentListItem {
  id: number;
  title: string;
  percentCompletion: number;
}

export class DocumentService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  }

  async fetchDocuments(): Promise<DocumentListItem[]> {
    const response = await fetch('/api/registry-files');
    if (!response.ok) {
      throw new Error('Памылка загрузкі дакумэнтаў');
    }
    return response.json();
  }

  async fetchDocument(
    documentId: string,
    skipUpToId: number = 0
  ): Promise<DocumentData> {
    const url = new URL(`/api/registry-files/${documentId}`, this.baseUrl);
    url.searchParams.set('skipUpToId', skipUpToId.toString());
    url.searchParams.set('take', '20');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Не ўдалося загрузіць дакумэнт');
    }
    return response.json();
  }

  async saveParadigmFormId(
    documentId: string,
    paragraphId: number,
    paragraphStamp: string,
    sentenceId: number,
    sentenceStamp: string,
    wordIndex: number,
    paradigmFormId: ParadigmFormId
  ): Promise<void> {
    const url = `/api/registry-files/${documentId}/${paragraphId}.${paragraphStamp}/${sentenceId}.${sentenceStamp}/${wordIndex}/paradigm-form-id`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paradigmFormId),
    });

    if (!response.ok) {
      throw new Error('Не ўдалося захаваць змены');
    }
  }
}

export const documentService = new DocumentService();
