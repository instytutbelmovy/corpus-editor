import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button } from '@/app/components';
import { SelectInput, TextInput } from '@/app/components/Field';
import {
  PART_OF_SPEECH_LABELS,
  buildTag,
} from '@/app/docs/linguisticCategories';
import {
  Paradigm,
  ParadigmInput,
  ParadigmSource,
  ParadigmVariant,
} from '../types';
import {
  newVariant,
  nextVariantId,
  prepareInput,
  stressInput,
  suggestedFormTags,
} from '../editing';
import { CategoryFields } from './CategoryFields';
import { serviceLocator } from '@/app/services/serviceLocator';
import { errorMessage } from '@/app/utils/errors';
import { summarizeTag } from '../categorySummary';

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
    if (
      !input.lemma ||
      !pos ||
      input.variants.some(v => !v.lemma || !v.forms.length)
    ) {
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
      <h2 className="text-xl font-semibold">
        {copying
          ? 'Копія парадыгмы'
          : original
            ? 'Рэдагаваньне парадыгмы'
            : 'Новая парадыгма'}
      </h2>
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
      <p className="text-sm text-gray-500">
        Каб паставіць націск, увядзіце + пасьля літары. Пустыя словаформы не
        захоўваюцца.
      </p>
      {error && <Alert>{error}</Alert>}
      <fieldset disabled={saving} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <TextInput
            id="paradigm-lemma"
            label="Лема"
            required
            maxLength={200}
            value={draft.lemma}
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
          <SelectInput
            id="paradigm-pos"
            label="Часьціна мовы"
            required
            value={pos}
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
                  forms: v.forms.map(f => ({
                    ...f,
                    tag: suggestedFormTags(tag)[0],
                  })),
                })),
              });
            }}
          >
            <option value="">Выберыце часьціну мовы</option>
            {Object.entries(PART_OF_SPEECH_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </SelectInput>
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
            <TextInput
              id="paradigm-meaning"
              label="Значэньне (неабавязкова)"
              value={draft.meaning ?? ''}
              onChange={e => update({ ...draft, meaning: e.target.value })}
            />
            {draft.variants.map((variant, index) => (
              <section
                key={variant.id}
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
                        variants: draft.variants.filter((_, i) => i !== index),
                      });
                    }}
                  >
                    Выдаліць варыянт
                  </Button>
                </div>
                <TextInput
                  id={`variant-${variant.id}-lemma`}
                  label="Лема варыянту"
                  required
                  maxLength={200}
                  value={variant.lemma}
                  onChange={e =>
                    updateVariant(index, {
                      ...variant,
                      lemma: stressInput(e.target.value),
                    })
                  }
                />
                <details>
                  <summary className="cursor-pointer text-sm text-gray-600">
                    Катэгорыі варыянту
                  </summary>
                  <div className="pt-3">
                    <CategoryFields
                      paradigmTag={variant.tag}
                      onChange={tag =>
                        updateVariant(index, { ...variant, tag })
                      }
                    />
                  </div>
                </details>
                <div className="space-y-3">
                  {variant.forms.map((form, formIndex) => (
                    <div
                      key={formIndex}
                      className="border-t border-gray-100 pt-3 space-y-2"
                    >
                      <div className="flex items-end gap-3">
                        <TextInput
                          id={`form-${variant.id}-${formIndex}`}
                          fieldClassName="flex-1"
                          label={
                            summarizeTag(
                              { paradigmTag: variant.tag, formTag: form.tag },
                              'form'
                            ) || 'Словаформа'
                          }
                          maxLength={200}
                          value={form.value}
                          onChange={e =>
                            updateVariant(index, {
                              ...variant,
                              forms: variant.forms.map((f, i) =>
                                i === formIndex
                                  ? { ...f, value: stressInput(e.target.value) }
                                  : f
                              ),
                            })
                          }
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={variant.forms.length === 1}
                          aria-label={`Выдаліць форму ${form.value || formIndex + 1}`}
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
                          Выдаліць
                        </Button>
                      </div>
                      <details>
                        <summary className="cursor-pointer text-sm text-gray-500">
                          Катэгорыі формы
                        </summary>
                        <div className="pt-3">
                          <CategoryFields
                            paradigmTag={variant.tag}
                            formTag={form.tag}
                            onChange={tag =>
                              updateVariant(index, {
                                ...variant,
                                forms: variant.forms.map((f, i) =>
                                  i === formIndex ? { ...f, tag } : f
                                ),
                              })
                            }
                          />
                        </div>
                      </details>
                    </div>
                  ))}
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
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      updateVariant(index, {
                        ...variant,
                        forms: [
                          ...variant.forms,
                          ...suggestedFormTags(variant.tag)
                            .filter(
                              tag => !variant.forms.some(f => f.tag === tag)
                            )
                            .map(tag => ({ tag, value: '' })),
                        ],
                      })
                    }
                  >
                    Дадаць граматычныя пазыцыі
                  </Button>
                </div>
              </section>
            ))}
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
