import { ApiClient, unwrap } from '@/app/apiClient';
import {
  DocumentData,
  DocumentEditResponse,
  DocumentHeader,
  GrammarInfo,
  ParadigmFormId,
  ParagraphOperation,
  TagAllAccepted,
  UploadJobAccepted,
  UploadJobStatus,
  WordRef,
} from './types';

interface CreateDocumentData {
  n: number;
  title: string;
  url?: string;
  publicationDate?: string;
  type?: string;
  style?: string;
  corpus?: string;
  file: File;
}

export interface DocumentLookups {
  types: string[];
  styles: string[];
  corpora: string[];
}

const byN = (a: DocumentHeader, b: DocumentHeader) => a.n - b.n;
const unique = (values: string[]) => Array.from(new Set(values));

export class DocumentService {
  constructor(private readonly apiClient: ApiClient) {}

  async fetchDocuments(): Promise<DocumentHeader[]> {
    return unwrap(
      await this.apiClient.get<DocumentHeader[]>('/registry-files')
    ).sort(byN);
  }

  async refreshDocumentsList(): Promise<DocumentHeader[]> {
    return unwrap(
      await this.apiClient.post<DocumentHeader[]>('/registry-files/refresh', {})
    ).sort(byN);
  }

  async refreshDocument(documentId: number): Promise<DocumentHeader> {
    return unwrap(
      await this.apiClient.post<DocumentHeader>(
        `/registry-files/${documentId}/refresh`,
        {}
      )
    );
  }

  // Даведнікі для формы дакумэнта
  async fetchLookups(): Promise<DocumentLookups> {
    const [types, styles, corpora] = await Promise.all([
      this.apiClient.get<string[]>('/registry-files/types'),
      this.apiClient.get<string[]>('/registry-files/styles'),
      this.apiClient.get<string[]>('/registry-files/corpora'),
    ]);
    return {
      types: unique(unwrap(types)),
      styles: unique(unwrap(styles)),
      corpora: unique(unwrap(corpora)),
    };
  }

  async createDocument(documentData: CreateDocumentData): Promise<void> {
    const formData = new FormData();
    formData.append('n', documentData.n.toString());
    formData.append('title', documentData.title);
    if (documentData.url) formData.append('url', documentData.url);
    if (documentData.publicationDate)
      formData.append('publicationDate', documentData.publicationDate);
    if (documentData.type) formData.append('type', documentData.type);
    if (documentData.style) formData.append('style', documentData.style);
    if (documentData.corpus) formData.append('corpus', documentData.corpus);
    formData.append('file', documentData.file);

    unwrap(await this.apiClient.postFormData('/registry-files', formData));
  }

  // Ставіць дакумэнт у чаргу на перазьметку праз Stanza
  async tagDocument(documentId: number): Promise<void> {
    unwrap(
      await this.apiClient.post<UploadJobAccepted>(
        `/registry-files/${documentId}/tag`,
        {}
      )
    );
  }

  // Тое самае для ўсяго рэестру; вяртае, колькі дакумэнтаў сталі ў чаргу
  async tagAllDocuments(): Promise<number> {
    return unwrap(
      await this.apiClient.post<TagAllAccepted>('/registry-files/tag', {})
    ).enqueued;
  }

  async getUploadJobs(): Promise<UploadJobStatus[]> {
    return unwrap(await this.apiClient.get<UploadJobStatus[]>('/upload-jobs'));
  }

  async fetchDocument(
    documentId: string,
    skipUpToId: number = 0,
    take: number = 20
  ): Promise<DocumentData> {
    return unwrap(
      await this.apiClient.get<DocumentData>(
        `/registry-files/${documentId}?skipUpToId=${skipUpToId}&take=${take}`
      )
    );
  }

  async fetchDocumentMetadata(documentId: number): Promise<DocumentHeader> {
    return unwrap(
      await this.apiClient.get<DocumentHeader>(
        `/registry-files/${documentId}/metadata`
      )
    );
  }

  async updateMetadata(
    documentId: number,
    metadata: Omit<
      DocumentHeader,
      'n' | 'percentCompletion' | 'posCompletion' | 'author' | 'language'
    >
  ): Promise<void> {
    unwrap(
      await this.apiClient.put(
        `/registry-files/${documentId}/metadata`,
        metadata
      )
    );
  }

  async saveDocument(
    documentId: number,
    operations: ParagraphOperation[]
  ): Promise<DocumentEditResponse> {
    return unwrap(
      await this.apiClient.post<DocumentEditResponse>(
        `/registry-files/${documentId}/edit`,
        { operations }
      )
    );
  }

  // Разьметка асобнага слова: PUT на адрас слова з concurrency stamp'амі абзаца і сказа

  async saveParadigmFormId(
    documentId: string,
    word: WordRef,
    paradigmFormId: ParadigmFormId
  ): Promise<void> {
    unwrap(
      await this.apiClient.put(
        wordUrl(documentId, word, 'paradigm-form-id'),
        paradigmFormId
      )
    );
  }

  async updateWordText(
    documentId: string,
    word: WordRef,
    text: string
  ): Promise<GrammarInfo[]> {
    return unwrap(
      await this.apiClient.put<GrammarInfo[]>(
        wordUrl(documentId, word, 'text'),
        text
      )
    );
  }

  async saveLemmaTag(
    documentId: string,
    word: WordRef,
    lemma: string,
    linguisticTag: string
  ): Promise<void> {
    unwrap(
      await this.apiClient.put(wordUrl(documentId, word, 'lemma-tag'), {
        lemma,
        linguisticTag,
      })
    );
  }

  async saveComment(
    documentId: string,
    word: WordRef,
    comment: string
  ): Promise<void> {
    unwrap(
      await this.apiClient.put(wordUrl(documentId, word, 'comment'), comment)
    );
  }

  async saveErrorType(
    documentId: string,
    word: WordRef,
    errorType: number
  ): Promise<void> {
    unwrap(
      await this.apiClient.put(
        wordUrl(documentId, word, 'error-type'),
        errorType
      )
    );
  }
}

function wordUrl(documentId: string, word: WordRef, suffix: string): string {
  return `/registry-files/${documentId}/${word.paragraphId}.${word.paragraphStamp}/${word.sentenceId}.${word.sentenceStamp}/${word.wordIndex}/${suffix}`;
}
