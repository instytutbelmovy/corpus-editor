import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button } from '@/app/components';
import { inputClasses } from '@/app/components/Field';
import { CloseIcon } from '@/app/components/icons';
import {
  PART_OF_SPEECH_LABELS,
  buildTag,
  formCategoryKeys,
  paradigmCategoryKeys,
  parseTagCodes,
} from '@/app/docs/linguisticCategories';
import {
  Paradigm,
  ParadigmInput,
  ParadigmSource,
  ParadigmVariant,
} from '../types';
import {
  defaultForms,
  newVariant,
  nextVariantId,
  prepareInput,
  relabelVariants,
  stressInput,
} from '../editing';
import { CategoryFields } from './CategoryFields';
import { CompactCategorySelect } from './CompactCategorySelect';
import { serviceLocator } from '@/app/services/serviceLocator';
import { errorMessage } from '@/app/utils/errors';

export function ParadigmEditor({
  original,
  onSaved,
  onCancel,
}: {
  original: Paradigm | null;
  onSaved: (saved: Paradigm) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ParadigmInput>(() =>
    original
      ? structuredClone(original)
      : {
          lemma: '',
          tag: '',
          meaning: null,
          variants: [newVariant('a', '', '')],
        }
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copying = original?.source === ParadigmSource.Upstream;
  const pos = draft.tag[0] ?? '';
  const update = (value: ParadigmInput) => {
    setDraft(value);
    setDirty(true);
  };
  const updateVariant = (index: number, value: ParadigmVariant) =>
    update({
      ...draft,
      variants: draft.variants.map((v, i) => (i === index ? value : v)),
    });

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const input = prepareInput(draft);
    if (!input.lemma || !pos || input.variants.some(v => !v.forms.length)) {
      setError(
        'Пазначце лему, часьціну мовы і хаця б адну словаформу для кожнага варыянту.'
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const service = serviceLocator.grammarService;
      const saved = original
        ? copying
          ? await service.copyParadigm(original.paradigmId, input)
          : await service.updateParadigm(original.paradigmId, input)
        : await service.createParadigm(input);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-xl font-semibold">
          {copying
            ? 'Копія парадыгмы'
            : original
              ? 'Рэдагаваньне парадыгмы'
              : 'Новая парадыгма'}
        </h2>
        <p className="text-sm text-gray-500">
          Каб паставіць націск, увядзіце + пасьля літары. Пустыя словаформы не
          захоўваюцца.
        </p>
      </div>
      {copying && (
        <p className="text-sm text-gray-600">
          Арыгінал будзе схаваны пасьля захаваньня копіі.
        </p>
      )}
      {original && (
        <p className="text-sm text-gray-600">
          Існая разьметка корпусу застанецца бязь зьменаў.
        </p>
      )}
      {error && <Alert>{error}</Alert>}
      <fieldset disabled={saving} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <input
            id="paradigm-lemma"
            aria-label="Лема"
            placeholder="Лема"
            required
            maxLength={200}
            value={draft.lemma}
            className={inputClasses(false, 'h-9')}
            onChange={e => {
              const lemma = stressInput(e.target.value);
              update({
                ...draft,
                lemma,
                variants: draft.variants.map(v =>
                  v.lemma === draft.lemma
                    ? {
                        ...v,
                        lemma,
                        forms: v.forms.map(f =>
                          f.value === v.lemma ? { ...f, value: lemma } : f
                        ),
                      }
                    : v
                ),
              });
            }}
          />
          <select
            id="paradigm-pos"
            aria-label="Часьціна мовы"
            required
            value={pos}
            className={inputClasses(false, 'h-9')}
            onChange={e => {
              const next = e.target.value;
              if (
                pos &&
                !window.confirm(
                  'Зьмена часьціны мовы скіне граматычныя катэгорыі парадыгмы і формаў. Працягнуць?'
                )
              )
                return;
              const tag = buildTag(next, {}).paradigmTag;
              update({
                ...draft,
                tag,
                variants: draft.variants.map(v => ({
                  ...v,
                  tag,
                  forms: defaultForms(tag, v.lemma),
                })),
              });
            }}
          >
            <option value="">Часьціна мовы</option>
            {Object.entries(PART_OF_SPEECH_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {pos && (
          <>
            <CategoryFields
              paradigmTag={draft.tag}
              onChange={tag =>
                update({
                  ...draft,
                  tag,
                  variants: draft.variants.map(v =>
                    v.tag === draft.tag ? { ...v, tag } : v
                  ),
                })
              }
            />
            <input
              id="paradigm-meaning"
              aria-label="Значэньне (неабавязкова)"
              placeholder="Значэньне (неабавязкова)"
              value={draft.meaning ?? ''}
              className={inputClasses()}
              onChange={e => update({ ...draft, meaning: e.target.value })}
            />
            {draft.variants.map((variant, index) => {
              const paradigmCodes = parseTagCodes(
                { paradigmTag: draft.tag, formTag: null },
                'all'
              );
              const variantCodes = parseTagCodes(
                { paradigmTag: variant.tag, formTag: null },
                'all'
              );
              return (
                <section
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 space-y-4"
                >
                  <div className="flex justify-between items-center gap-3">
                    <h3 className="font-semibold">Варыянт {variant.id}</h3>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={draft.variants.length === 1}
                      onClick={() => {
                        if (
                          !window.confirm(
                            'Выдаліць варыянт і ўсе ягоныя формы? Існыя спасылкі ў корпусе могуць страціць адпаведнасьць.'
                          )
                        )
                          return;
                        update({
                          ...draft,
                          variants: relabelVariants(
                            draft.variants.filter((_, i) => i !== index)
                          ),
                        });
                      }}
                    >
                      Выдаліць варыянт
                    </Button>
                  </div>
                  <div className="flex items-end gap-2">
                    {paradigmCategoryKeys(pos).map(key => (
                      <CompactCategorySelect
                        key={key}
                        pos={pos}
                        categoryKey={key}
                        value={
                          variantCodes[key] === paradigmCodes[key]
                            ? ''
                            : (variantCodes[key] ?? '')
                        }
                        onChange={code => {
                          const merged = {
                            ...variantCodes,
                            [key]: code === '' ? paradigmCodes[key] : code,
                          };
                          updateVariant(index, {
                            ...variant,
                            tag: buildTag(pos, merged).paradigmTag,
                          });
                        }}
                      />
                    ))}
                    <input
                      id={`variant-${variant.id}-lemma`}
                      aria-label="Лема варыянту"
                      placeholder="Лема варыянту"
                      maxLength={200}
                      value={variant.lemma === draft.lemma ? '' : variant.lemma}
                      className={inputClasses(false, 'flex-1 h-9')}
                      onChange={e =>
                        updateVariant(index, {
                          ...variant,
                          lemma: stressInput(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    {variant.forms.map((form, formIndex) => {
                      const formCodes = parseTagCodes(
                        { paradigmTag: variant.tag, formTag: form.tag },
                        'form'
                      );
                      return (
                        <div
                          key={formIndex}
                          className="flex items-end gap-2 border-t border-gray-100 pt-3"
                        >
                          {formCategoryKeys(pos, formCodes).map(key => (
                            <CompactCategorySelect
                              key={key}
                              pos={pos}
                              categoryKey={key}
                              value={formCodes[key] ?? ''}
                              onChange={code => {
                                const merged = { ...formCodes, [key]: code };
                                updateVariant(index, {
                                  ...variant,
                                  forms: variant.forms.map((f, i) =>
                                    i === formIndex
                                      ? {
                                          ...f,
                                          tag:
                                            buildTag(pos, merged).formTag ?? '',
                                        }
                                      : f
                                  ),
                                });
                              }}
                            />
                          ))}
                          <input
                            id={`form-${variant.id}-${formIndex}`}
                            aria-label="Словаформа"
                            maxLength={200}
                            value={form.value}
                            className={inputClasses(false, 'flex-1 h-9')}
                            onChange={e =>
                              updateVariant(index, {
                                ...variant,
                                forms: variant.forms.map((f, i) =>
                                  i === formIndex
                                    ? {
                                        ...f,
                                        value: stressInput(e.target.value),
                                      }
                                    : f
                                ),
                              })
                            }
                          />
                          <button
                            type="button"
                            disabled={variant.forms.length === 1}
                            aria-label={`Выдаліць форму ${form.value || formIndex + 1}`}
                            title="Выдаліць форму"
                            className="h-9 w-9 shrink-0 flex items-center justify-center border border-gray-300 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                            onClick={() => {
                              if (
                                original &&
                                form.value &&
                                !window.confirm(
                                  'Выдаліць форму? Існая разьметка корпусу ня будзе абноўленая.'
                                )
                              )
                                return;
                              updateVariant(index, {
                                ...variant,
                                forms: variant.forms.filter(
                                  (_, i) => i !== formIndex
                                ),
                              });
                            }}
                          >
                            <CloseIcon className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        updateVariant(index, {
                          ...variant,
                          forms: [
                            ...variant.forms,
                            { tag: variant.forms.at(-1)?.tag ?? '', value: '' },
                          ],
                        })
                      }
                    >
                      Дадаць форму
                    </Button>
                  </div>
                </section>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              disabled={!nextVariantId(draft.variants)}
              onClick={() => {
                const id = nextVariantId(draft.variants);
                if (id)
                  update({
                    ...draft,
                    variants: [
                      ...draft.variants,
                      newVariant(id, draft.lemma, draft.tag),
                    ],
                  });
              }}
            >
              Дадаць варыянт
            </Button>
          </>
        )}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={!pos || !draft.lemma.trim()}
            loading={saving}
            loadingText="Захаваньне…"
          >
            {copying ? 'Захаваць копію і схаваць арыгінал' : 'Захаваць'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (!dirty || window.confirm('Адкінуць незахаваныя зьмены?'))
                onCancel();
            }}
          >
            Скасаваць
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
