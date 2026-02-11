export interface ParadigmFormId {
  paradigmId: number;
  variantId: string;
  formTag: string | null;
}

export interface LinguisticTag {
  paradigmTag: string;
  formTag: string | null;
}

export enum LinguisticErrorType {
  None = 0,
  Lexical = 5,
  Orthoepic = 10,
  Formational = 15,
  Stylistic = 20,
  Grammatical = 25,
}

export interface Metadata {
  suggested: unknown;
  resolvedOn: string | null;
  errorType?: LinguisticErrorType;
}

export enum SentenceItemType {
  Word = 1,
  Punctuation = 2,
  LineBreak = 4,
}

export interface LinguisticItem {
  paradigmFormId: ParadigmFormId | null;
  lemma: string | null;
  linguisticTag: LinguisticTag | null;
  comment: string;
  metadata: Metadata | null;
  text: string;
  type: SentenceItemType;
  glueNext: boolean;
}

export interface GrammarInfo {
  paradigmFormId: ParadigmFormId | null;
  linguisticTag: LinguisticTag;
  lemma: string;
  meaning: string | null;
}

export interface SentenceItem {
  linguisticItem: LinguisticItem;
  options: GrammarInfo[];
}

export interface Sentence {
  id: number;
  concurrencyStamp: string;
  sentenceItems: SentenceItem[];
}

export interface Paragraph {
  id: number;
  concurrencyStamp: string;
  sentences: Sentence[];
}

export interface DocumentHeader {
  n: number;
  title: string;
  author?: string;
  language?: string;
  publicationDate?: string;
  url?: string;
  type?: string;
  style?: string;
  corpus?: string;
  percentCompletion: number;
}

export interface DocumentData {
  header: DocumentHeader;
  paragraphs: Paragraph[];
}

export interface SelectedWord {
  paragraphId: number;
  paragraphStamp: string;
  sentenceId: number;
  sentenceStamp: string;
  wordIndex: number;
  item: LinguisticItem;
  options: GrammarInfo[];
}
export enum OperationType {
  Delete = -1,
  Update = 0,
  Create = 1,
}

export interface ParagraphOperation {
  paragraphId: number;
  operationType: OperationType;
  replacementSentences: LinguisticItem[][] | null;
  concurrencyStamp?: string | null;
}

export interface DocumentEditResponse {
  editedParagraphs: Paragraph[];
}
