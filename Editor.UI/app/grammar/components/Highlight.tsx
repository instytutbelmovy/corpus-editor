import { findPrefixMatch } from '../normalize';

interface HighlightProps {
  text: string;
  query: string;
}

// Тлусты пачатак радка, які супаў з пошукавым запытам (пошук - прэфіксны)
export function Highlight({ text, query }: HighlightProps) {
  const match = findPrefixMatch(text, query);
  if (!match) {
    return <>{text}</>;
  }

  return (
    <>
      <strong className="font-bold">
        {text.slice(match.start, match.end)}
      </strong>
      {text.slice(match.end)}
    </>
  );
}
