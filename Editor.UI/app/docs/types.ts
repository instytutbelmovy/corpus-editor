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

export enum ResolutionSource {
  NotResolved = 0,
  Human = 1,
  Unknown = 10,
  GrammarDb = 20,
  Stanza = 30,
}

export interface Metadata {
  suggested: unknown;
  resolvedOn: string | null;
  resolvedBy?: ResolutionSource;
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
  posCompletion: number | null;
}

export interface DocumentData {
  header: DocumentHeader;
  paragraphs: Paragraph[];
}

export enum UploadJobState {
  Queued = 0,
  Running = 1,
  Succeeded = 2,
  Failed = 3,
}

export enum UploadJobStage {
  Queued = 0,
  Parsing = 1,
  LookingUpGrammar = 2,
  Tagging = 3,
  Saving = 4,
  Done = 5,
  Loading = 6,
}

// Што за праца: загрузка новага дакумэнту ці перазьметка ўжо наяўнага
export enum UploadJobKind {
  Upload = 0,
  Tagging = 1,
}

export interface UploadJobStatus {
  id: string;
  n: number;
  title: string;
  kind: UploadJobKind;
  state: UploadJobState;
  stage: UploadJobStage;
  processedTokens: number;
  totalTokens: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

// Адказ на пастаноўку заданьня ў чаргу
export interface UploadJobAccepted {
  jobId: string;
}

// Адказ на масавую перазьметку
export interface TagAllAccepted {
  enqueued: number;
}

// Пазыцыя слова ў дакумэнце
export interface WordPosition {
  paragraphId: number;
  sentenceId: number;
  wordIndex: number;
}

// Пазыцыя разам з concurrency stamp'амі абзаца і сказа - адрас для API
export interface WordRef extends WordPosition {
  paragraphStamp: string;
  sentenceStamp: string;
}

export interface SelectedWord extends WordRef {
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
