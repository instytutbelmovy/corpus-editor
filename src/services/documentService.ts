import { DocumentData, ParadigmFormId, GrammarInfo } from '@/types/document';

interface DocumentListItem {
  id: number;
  title: string;
  percentCompletion: number;
}

interface CreateDocumentData {
  documentNumber: number;
  title: string;
  link?: string;
  publicationYear?: number;
  textType: 'вусны' | 'пісьмовы';
  style?: 'публіцыстычны' | 'мастацкі' | 'афіцыйна-справавы' | 'навуковы' | 'гутарковы';
  genres: string[];
  file: File;
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
    const data = await response.json();
    data.sort((a: DocumentListItem, b: DocumentListItem) => a.id - b.id);
    return data;
  }

  async createDocument(documentData: CreateDocumentData): Promise<void> {
    const formData = new FormData();
    formData.append('documentNumber', documentData.documentNumber.toString());
    formData.append('title', documentData.title);
    if (documentData.link) formData.append('link', documentData.link);
    if (documentData.publicationYear) formData.append('publicationYear', documentData.publicationYear.toString());
    formData.append('textType', documentData.textType);
    if (documentData.style) formData.append('style', documentData.style);
    documentData.genres.forEach(genre => formData.append('genres', genre));
    formData.append('file', documentData.file);

    const response = await fetch('/api/registry-files', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Памылка пры загрузцы файла');
    }
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

  async updateWordText(
    documentId: string,
    paragraphId: number,
    paragraphStamp: string,
    sentenceId: number,
    sentenceStamp: string,
    wordIndex: number,
    text: string
  ): Promise<GrammarInfo[]> {
    const url = `/api/registry-files/${documentId}/${paragraphId}.${paragraphStamp}/${sentenceId}.${sentenceStamp}/${wordIndex}/text`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(text),
    });

    if (!response.ok) {
      throw new Error('Не ўдалося змяніць тэкст слова');
    }

    return response.json();
  }

  async saveLemmaTag(
    documentId: string,
    paragraphId: number,
    paragraphStamp: string,
    sentenceId: number,
    sentenceStamp: string,
    wordIndex: number,
    lemma: string,
    linguisticTag: string
  ): Promise<void> {
    const url = `/api/registry-files/${documentId}/${paragraphId}.${paragraphStamp}/${sentenceId}.${sentenceStamp}/${wordIndex}/lemma-tag`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lemma, linguisticTag }),
    });

    if (!response.ok) {
      throw new Error('Не ўдалося захаваць лінгвістычныя катэгорыі');
    }
  }

  async saveComment(
    documentId: string,
    paragraphId: number,
    paragraphStamp: string,
    sentenceId: number,
    sentenceStamp: string,
    wordIndex: number,
    comment: string
  ): Promise<void> {
    const url = `/api/registry-files/${documentId}/${paragraphId}.${paragraphStamp}/${sentenceId}.${sentenceStamp}/${wordIndex}/comment`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(comment),
    });

    if (!response.ok) {
      throw new Error('Не ўдалося захаваць каментар');
    }
  }
}

export const documentService = new DocumentService();
