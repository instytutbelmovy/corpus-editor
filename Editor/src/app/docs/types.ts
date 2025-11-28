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

export interface LinguisticItem {
  paradigmFormId: ParadigmFormId | null;
  lemma: string | null;
  linguisticTag: LinguisticTag | null;
  comment: string;
  metadata: Metadata | null;
  text: string;
  type: number; // 1 = Word, 2 = Punctuation, 4 = LineBreak
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
  author: string | null;
  language: string | null;
  publicationDate: string | null;
  url: string | null;
  type: string;
  style: string;
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
