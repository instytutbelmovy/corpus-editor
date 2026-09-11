// Адпаведнікі ParadigmResponse/VariantResponse/FormResponse з Editor.Services/Grammar

export enum ParadigmSource {
  Upstream = 0,
  Local = 1,
}

export interface ParadigmForm {
  tag: string;
  value: string;
}

export interface ParadigmVariant {
  id: string;
  lemma: string;
  // Эфэктыўны тэг варыянту: свой, або тэг парадыгмы, калі свайго няма
  tag: string;
  forms: ParadigmForm[];
}

export interface Paradigm {
  paradigmId: number;
  lemma: string;
  tag: string;
  meaning: string | null;
  source: ParadigmSource;
  hidden: boolean;
  copiedFromParadigmId: number | null;
  variants: ParadigmVariant[];
}

export type ParadigmInput = Pick<
  Paradigm,
  'lemma' | 'tag' | 'meaning' | 'variants'
>;
