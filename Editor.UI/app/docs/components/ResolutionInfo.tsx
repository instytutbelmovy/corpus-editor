import { Metadata, ResolutionSource } from '../types';

interface ResolutionInfoProps {
  metadata: Metadata | null;
}

const SOURCE_LABELS: Partial<Record<ResolutionSource, string>> = {
  [ResolutionSource.Human]: 'рэдактар',
  [ResolutionSource.GrammarDb]: 'грамбаза',
  [ResolutionSource.Stanza]: 'stanza',
};

const SOURCE_TITLES: Partial<Record<ResolutionSource, string>> = {
  [ResolutionSource.Human]: 'Рэдактар выбраў форму ўручную.',
  [ResolutionSource.GrammarDb]:
    'У граматычнай базе знайшоўся адзіны варыянт.',
  [ResolutionSource.Stanza]:
    'Форму вызначыла мадэль Stanza сярод некалькіх кандыдатаў з граматычнае базы.',
  [ResolutionSource.Unknown]:
    'Крыніца невядомая: слова было разьмечанае да ўвядзеньня гэтага поля.',
};

// Дата і крыніца разьмеркаваньня слова. Заўсёды займае аднолькавую вышыню, каб выбар неразьмечанага слова ня зрушваў панэль.
export function ResolutionInfo({ metadata }: ResolutionInfoProps) {
  const resolvedOn = metadata?.resolvedOn;
  const resolvedBy = metadata?.resolvedBy;
  const label =
    resolvedBy !== undefined ? SOURCE_LABELS[resolvedBy] : undefined;
  const tooltip =
    resolvedBy !== undefined ? SOURCE_TITLES[resolvedBy] : undefined;

  return (
    <div
      className="h-4 mb-1 text-xs text-gray-400"
      title={resolvedOn ? tooltip : undefined}
    >
      {resolvedOn && (
        <>
          {resolvedOn.slice(0, 10)}
          {label && <> {label}</>}
        </>
      )}
    </div>
  );
}
