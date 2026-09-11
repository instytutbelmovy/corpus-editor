import { Paradigm, ParadigmVariant } from '../types';
import { summarizeTag, summarizeTagDiff } from '../categorySummary';
import { Highlight } from './Highlight';
import { ChevronRightIcon } from '@/app/components/icons';

interface ParadigmAccordionProps {
  paradigm: Paradigm;
  query: string;
  expanded: boolean;
  onToggle: () => void;
}

export function ParadigmAccordion({
  paradigm,
  query,
  expanded,
  onToggle,
}: ParadigmAccordionProps) {
  const headerSummary = summarizeTag({
    paradigmTag: paradigm.tag,
    formTag: null,
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">
              <Highlight text={paradigm.lemma} query={query} />
            </span>
            {paradigm.hidden && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                схавана
              </span>
            )}
          </div>
          {headerSummary && (
            <div className="text-sm text-gray-500 mt-0.5">{headerSummary}</div>
          )}
          {paradigm.meaning && (
            <div className="text-sm text-gray-500 italic mt-0.5">
              {paradigm.meaning}
            </div>
          )}
        </div>
        <ChevronRightIcon
          className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${
            expanded ? 'rotate-90' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-4">
          {paradigm.variants.map(variant => (
            <VariantBlock
              key={variant.id}
              variant={variant}
              paradigmTag={paradigm.tag}
              // Пры адзіным варыянце ягоная лема і ідэнтыфікатар нічога не дадаюць да загалоўка
              showLabel={paradigm.variants.length > 1}
              query={query}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VariantBlock({
  variant,
  paradigmTag,
  showLabel,
  query,
}: {
  variant: ParadigmVariant;
  paradigmTag: string;
  showLabel: boolean;
  query: string;
}) {
  // Толькі тое, чым варыянт адрозьніваецца ад парадыгмы: астатняе стаіць у загалоўку
  const tagDiff = summarizeTagDiff(paradigmTag, variant.tag);

  return (
    <div>
      {(showLabel || tagDiff) && (
        <div className="text-sm font-medium text-gray-700 mb-1.5">
          {showLabel && (
            <>
              <Highlight text={variant.lemma} query={query} />{' '}
              <span className="text-gray-400 font-normal">({variant.id})</span>
            </>
          )}
          {tagDiff && (
            <span className="text-gray-400 font-normal">
              {showLabel && ' · '}
              {tagDiff}
            </span>
          )}
        </div>
      )}
      {/* Формы ідуць зьверху ўніз слупкамі: спачатку запаўняецца першы слупок, потым наступны */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-x-4">
        {variant.forms.map((form, index) => {
          const formSummary = summarizeTag(
            { paradigmTag: variant.tag, formTag: form.tag },
            'form'
          );

          return (
            <div
              key={`${form.tag}-${index}`}
              className="text-sm text-gray-900 flex items-baseline gap-1.5 mb-1 break-inside-avoid"
            >
              <span>
                <Highlight text={form.value} query={query} />
              </span>
              {formSummary && (
                <span className="text-xs text-gray-400">{formSummary}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
