import { DocumentData, ParadigmFormId, GrammarInfo, DocumentHeader, ParagraphOperation, DocumentEditResponse } from './types';
import { ApiClient } from '@/app/apiClient';

interface CreateDocumentData {
  n: number;
  title: string;
  url?: string;
  publicationDate?: string;
  textType: 'вусны' | 'пісьмовы';
  style?: 'публіцыстычны' | 'мастацкі' | 'афіцыйна-справавы' | 'навуковы' | 'гутарковы';
  file: File;
}

export class DocumentService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  async fetchDocuments(): Promise<DocumentHeader[]> {
    const response = await this.apiClient.get<DocumentHeader[]>('/registry-files');
    if (response.error) {
      throw new Error(response.error);
    }
    const data = response.data!;
    data.sort((a: DocumentHeader, b: DocumentHeader) => a.n - b.n);
    return data;
  }

  async createDocument(documentData: CreateDocumentData): Promise<void> {
    const formData = new FormData();
    formData.append('n', documentData.n.toString());
    formData.append('title', documentData.title);
    if (documentData.url) formData.append('url', documentData.url);
    if (documentData.publicationDate) formData.append('publicationDate', documentData.publicationDate);
    formData.append('textType', documentData.textType);
    if (documentData.style) formData.append('style', documentData.style);
    formData.append('file', documentData.file);

    const response = await this.apiClient.postFormData('/registry-files', formData);

    if (response.error) {
      throw new Error(response.error);
    }
  }

  async fetchDocument(
    documentId: string,
    skipUpToId: number = 0,
    take: number = 20
  ): Promise<DocumentData> {
    const url = `/registry-files/${documentId}?skipUpToId=${skipUpToId}&take=${take}`;

    const response = await this.apiClient.get<DocumentData>(url);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  async fetchDocumentMetadata(documentId: number): Promise<DocumentHeader> {
    const response = await this.apiClient.get<DocumentHeader>(`/registry-files/${documentId}/metadata`);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  async updateMetadata(documentId: number, metadata: Omit<DocumentHeader, 'n' | 'percentCompletion' | 'author' | 'language'>): Promise<void> {
    const response = await this.apiClient.put(`/registry-files/${documentId}/metadata`, metadata);

    if (response.error) {
      throw new Error(response.error);
    }
  }

  async refreshDocument(documentId: number): Promise<DocumentHeader> {
    const response = await this.apiClient.post<DocumentHeader>(`/registry-files/${documentId}/refresh`, {});

    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  async refreshDocumentsList(): Promise<DocumentHeader[]> {
    const response = await this.apiClient.post<DocumentHeader[]>('/registry-files/refresh', {});

    if (response.error) {
      throw new Error(response.error);
    }
    const data = response.data!;
    data.sort((a: DocumentHeader, b: DocumentHeader) => a.n - b.n);
    return data;
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
    const url = `/registry-files/${documentId}/${paragraphId}.${paragraphStamp}/${sentenceId}.${sentenceStamp}/${wordIndex}/paradigm-form-id`;

    const response = await this.apiClient.put(url, paradigmFormId);

    if (response.error) {
      throw new Error(response.error);
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
    const url = `/registry-files/${documentId}/${paragraphId}.${paragraphStamp}/${sentenceId}.${sentenceStamp}/${wordIndex}/text`;

    const response = await this.apiClient.put<GrammarInfo[]>(url, text);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
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
    const url = `/registry-files/${documentId}/${paragraphId}.${paragraphStamp}/${sentenceId}.${sentenceStamp}/${wordIndex}/lemma-tag`;

    const response = await this.apiClient.put(url, { lemma, linguisticTag });

    if (response.error) {
      throw new Error(response.error);
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
    const url = `/registry-files/${documentId}/${paragraphId}.${paragraphStamp}/${sentenceId}.${sentenceStamp}/${wordIndex}/comment`;

    const response = await this.apiClient.put(url, comment);

    if (response.error) {
      throw new Error(response.error);
    }
  }

  async saveErrorType(
    documentId: string,
    paragraphId: number,
    paragraphStamp: string,
    sentenceId: number,
    sentenceStamp: string,
    wordIndex: number,
    errorType: number
  ): Promise<void> {
    const url = `/registry-files/${documentId}/${paragraphId}.${paragraphStamp}/${sentenceId}.${sentenceStamp}/${wordIndex}/error-type`;

    const response = await this.apiClient.put(url, errorType);

    if (response.error) {
      throw new Error(response.error);
    }
  }

  async saveDocument(documentId: number, operations: ParagraphOperation[]): Promise<DocumentEditResponse> {
    const url = `/registry-files/${documentId}/edit`;
    const response = await this.apiClient.post<DocumentEditResponse>(url, { operations });

    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }
}

// Экспарт класа, а не экземпляра
