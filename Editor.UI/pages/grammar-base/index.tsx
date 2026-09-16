import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, CardHeader, PageShell } from '@/app/components';
import { useAuthStore } from '@/app/auth/store';
import { Roles } from '@/app/auth/types';
import { ParadigmEditor } from '@/app/grammar/components/ParadigmEditor';
import { serviceLocator } from '@/app/services/serviceLocator';
import { errorMessage } from '@/app/utils/errors';
import { Paradigm } from '@/app/grammar/types';
import { SearchBar } from '@/app/grammar/components/SearchBar';
import { ParadigmAccordion } from '@/app/grammar/components/ParadigmAccordion';
import { useDebouncedValue } from '@/app/grammar/hooks/useDebouncedValue';

// Мусіць супадаць з ParadigmService.SearchLimit на бэкендзе
const SEARCH_LIMIT = 50;
const DEBOUNCE_MS = 300;

export default function GrammarBasePage() {
  const role = useAuthStore(s => s.user?.role);
  const canEdit = role === Roles.Editor || role === Roles.Admin;
  const [editing, setEditing] = useState<{ original: Paradigm | null } | null>(
    null
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Paradigm | null>(null);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);

  const [results, setResults] = useState<Paradigm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    serviceLocator.grammarService
      .searchParadigms(trimmed)
      .then(data => {
        if (cancelled) return;
        setResults(data);
        setHasSearched(true);
        // Пры дакладна адным выніку разгортваем яго адразу; інакш усе згорнутыя
        setExpandedIds(new Set(data.length === 1 ? [data[0].paradigmId] : []));
      })
      .catch(err => {
        if (cancelled) return;
        setError(errorMessage(err));
        setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, revision]);

  async function setHidden(paradigm: Paradigm) {
    setBusyId(paradigm.paradigmId);
    setActionError(null);
    try {
      await serviceLocator.grammarService.setHidden(
        paradigm.paradigmId,
        !paradigm.hidden
      );
      setSaved(prev =>
        prev?.paradigmId === paradigm.paradigmId
          ? { ...prev, hidden: !paradigm.hidden }
          : prev
      );
      setRevision(value => value + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const toggle = (paradigmId: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(paradigmId)) {
        next.delete(paradigmId);
      } else {
        next.add(paradigmId);
      }
      return next;
    });
  };

  // Запыт для падсьвятленьня — той жа, што сапраўды пайшоў у пошук (не кожная новая націснутая клявіша)
  const highlightQuery = useMemo(() => debouncedQuery.trim(), [debouncedQuery]);

  if (editing && canEdit)
    return (
      <PageShell>
        <Card>
          <ParadigmEditor
            original={editing.original}
            onCancel={() => setEditing(null)}
            onSaved={paradigm => {
              setSaved(paradigm);
              setEditing(null);
              setRevision(value => value + 1);
            }}
          />
        </Card>
      </PageShell>
    );

  const actions = (paradigm: Paradigm) => ({
    onEdit: canEdit ? () => setEditing({ original: paradigm }) : undefined,
    onSetHidden: canEdit ? () => void setHidden(paradigm) : undefined,
    busy: busyId !== null,
  });

  return (
    <PageShell>
      <Card>
        <CardHeader
          title="Граматычная база"
          subtitle="Пошук парадыгмаў па леме або словаформе"
        />
        <div className="px-6 py-4 border-b border-gray-200">
          {canEdit && (
            <Button
              className="mb-4"
              onClick={() => setEditing({ original: null })}
            >
              Дадаць парадыгму
            </Button>
          )}
          <SearchBar value={query} onChange={setQuery} loading={loading} />
        </div>

        <div className="px-6 py-4 space-y-3">
          {error && <Alert kind="error">{error}</Alert>}
          {actionError && (
            <Alert kind="error" onClose={() => setActionError(null)}>
              {actionError}
            </Alert>
          )}
          {saved && (
            <div className="space-y-3">
              <Alert kind="success" onClose={() => setSaved(null)}>
                Парадыгма захаваная
              </Alert>
              <ParadigmAccordion
                paradigm={saved}
                query=""
                expanded
                onToggle={() => setSaved(null)}
                {...actions(saved)}
              />
            </div>
          )}

          {!error && !hasSearched && (
            <p className="text-center text-gray-500 py-8">
              Пачніце ўводзіць лему ці словаформу, каб знайсьці парадыгму
            </p>
          )}

          {!error && hasSearched && results.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Нічога не знойдзена
            </p>
          )}

          {!error &&
            results
              .filter(p => p.paradigmId !== saved?.paradigmId)
              .map(paradigm => (
                <ParadigmAccordion
                  key={paradigm.paradigmId}
                  paradigm={paradigm}
                  query={highlightQuery}
                  expanded={expandedIds.has(paradigm.paradigmId)}
                  onToggle={() => toggle(paradigm.paradigmId)}
                  {...actions(paradigm)}
                />
              ))}

          {!error && results.length === SEARCH_LIMIT && (
            <p className="text-center text-sm text-gray-400 pt-2">
              Паказаныя першыя {SEARCH_LIMIT} вынікаў — удакладніце запыт, каб
              убачыць астатнія
            </p>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
