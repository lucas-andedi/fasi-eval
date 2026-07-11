'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScrollText, Filter, Lock, ArrowRight, Sparkles, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import type { Role } from '@/lib/types';
import { ROLE_LABEL } from '@/lib/rbac';
import { fmtDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input, Select, Field } from '@/components/ui/Input';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';

interface AuditEntry {
  id: number;
  createdAt: string;
  action: string;
  entity: string;
  entityId?: number | string | null;
  oldValue?: unknown;
  newValue?: unknown;
  exceptional?: boolean;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    roles: Role[];
  } | null;
}

type Filters = { action: string; entity: string; from: string; to: string };
const EMPTY: Filters = { action: '', entity: '', from: '', to: '' };

export default function AdminAuditPage() {
  // Applied filters (drive the query) vs. draft (bound to inputs)
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [filters, setFilters] = useState<Filters>(EMPTY);

  const { data: actions } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: async () => (await api.get<string[]>('/audit/actions')).data,
    staleTime: 5 * 60_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit', filters],
    queryFn: async () => {
      const params: Record<string, string> = { take: '200' };
      if (filters.action) params.action = filters.action;
      if (filters.entity.trim()) params.entity = filters.entity.trim();
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      return (await api.get<AuditEntry[]>('/audit', { params })).data;
    },
  });

  const entries = data ?? [];
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((s) => ({ ...s, [k]: v }));
  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(draft);
  };
  const reset = () => {
    setDraft(EMPTY);
    setFilters(EMPTY);
  };
  const hasFilters = draft.action || draft.entity || draft.from || draft.to;

  return (
    <div>
      <PageHeader
        eyebrow="Administration · CU-20"
        title="Journaux système"
        description="Historique complet et horodaté des actions. Consultation seule — les entrées d'audit sont immuables (RG-26)."
      />

      {/* Filters */}
      <motion.form
        onSubmit={apply}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 rounded-2xl border border-line bg-paper p-4"
      >
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
          <Filter className="h-3.5 w-3.5" /> Filtres
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <Field label="Action" className="lg:col-span-1">
            <Select value={draft.action} onChange={(e) => set('action', e.target.value)}>
              <option value="">Toutes les actions</option>
              {(actions ?? []).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Entité">
            <Input
              value={draft.entity}
              onChange={(e) => set('entity', e.target.value)}
              placeholder="p.ex. User, Session…"
            />
          </Field>
          <Field label="Du">
            <Input type="date" value={draft.from} onChange={(e) => set('from', e.target.value)} />
          </Field>
          <Field label="Au">
            <Input type="date" value={draft.to} onChange={(e) => set('to', e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Appliquer
            </Button>
            {hasFilters && (
              <Button type="button" variant="ghost" size="icon" onClick={reset} aria-label="Réinitialiser">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.form>

      {isLoading ? (
        <LoadingBlock label="Chargement du journal…" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Aucune entrée"
          description="Aucune action ne correspond à ces critères. Ajustez les filtres pour élargir la recherche."
        />
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted">
            <span>
              <span className="font-bold text-ink">{entries.length}</span> entrée{entries.length > 1 ? 's' : ''}
            </span>
            {isFetching && <span className="text-xs text-subtle">Actualisation…</span>}
          </div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Desktop : tableau */}
            <div className="hidden md:block">
              <Table>
                <THead>
                  <TR>
                    <TH>Date / heure</TH>
                    <TH>Utilisateur</TH>
                    <TH>Action</TH>
                    <TH>Entité</TH>
                    <TH>Détail</TH>
                  </TR>
                </THead>
                <TBody>
                  {entries.map((e) => (
                    <TR key={e.id} className={e.exceptional ? 'bg-warning-soft' : undefined}>
                      <TD className="whitespace-nowrap text-xs text-muted">{fmtDateTime(e.createdAt)}</TD>
                      <TD>
                        {e.user ? (
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              first={e.user.firstName}
                              last={e.user.lastName}
                              className="h-8 w-8 text-[11px]"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">
                                {e.user.firstName} {e.user.lastName}
                              </p>
                              <p className="truncate text-[11px] text-ink/45">{(e.user.roles ?? []).map((r) => ROLE_LABEL[r]).join(' · ')}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs italic text-ink/40">Système</span>
                        )}
                      </TD>
                      <TD>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="neutral">{e.action}</Badge>
                          {e.exceptional && (
                            <Badge tone="warning" dot>
                              <Sparkles className="h-3 w-3" /> Exceptionnel
                            </Badge>
                          )}
                        </div>
                      </TD>
                      <TD>
                        <span className="text-sm font-medium text-ink">{e.entity}</span>
                        {e.entityId !== null && e.entityId !== undefined && (
                          <span className="ml-1 font-mono text-xs text-subtle">#{String(e.entityId)}</span>
                        )}
                      </TD>
                      <TD>
                        <DetailCell oldValue={e.oldValue} newValue={e.newValue} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            {/* Mobile : liste de cartes empilées */}
            <div className="space-y-3 md:hidden">
              {entries.map((e) => (
                <div
                  key={e.id}
                  className={`card p-4 ${e.exceptional ? 'border-warning/40 bg-warning-soft' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">{fmtDateTime(e.createdAt)}</span>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Badge tone="neutral">{e.action}</Badge>
                      {e.exceptional && (
                        <Badge tone="warning" dot>
                          <Sparkles className="h-3 w-3" /> Exceptionnel
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2.5">
                    {e.user ? (
                      <>
                        <Avatar
                          first={e.user.firstName}
                          last={e.user.lastName}
                          className="h-8 w-8 text-[11px]"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {e.user.firstName} {e.user.lastName}
                          </p>
                          <p className="truncate text-[11px] text-ink/45">{(e.user.roles ?? []).map((r) => ROLE_LABEL[r]).join(' · ')}</p>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs italic text-ink/40">Système</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline gap-2 text-sm">
                    <span className="text-xs font-medium text-subtle">Entité</span>
                    <span className="font-medium text-ink">{e.entity}</span>
                    {e.entityId !== null && e.entityId !== undefined && (
                      <span className="font-mono text-xs text-subtle">#{String(e.entityId)}</span>
                    )}
                  </div>

                  {(e.oldValue !== null && e.oldValue !== undefined) ||
                  (e.newValue !== null && e.newValue !== undefined) ? (
                    <div className="mt-2">
                      <DetailCell oldValue={e.oldValue} newValue={e.newValue} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {/* Read-only footnote (RG-26) */}
      <div className="mt-5 flex items-center justify-center gap-2 text-xs text-ink/40">
        <Lock className="h-3.5 w-3.5" />
        <span>Journal en lecture seule — les entrées sont conservées de manière immuable (RG-26).</span>
      </div>
    </div>
  );
}

/* ---------------- Old → New value renderer ---------------- */
function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function DetailCell({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) {
  const hasOld = oldValue !== null && oldValue !== undefined;
  const hasNew = newValue !== null && newValue !== undefined;

  if (!hasOld && !hasNew) {
    return <span className="text-xs text-ink/30">—</span>;
  }

  return (
    <div className="flex max-w-[22rem] items-center gap-1.5 text-[11px]">
      {hasOld && (
        <span className="max-w-[9rem] truncate rounded-md bg-danger/8 px-1.5 py-0.5 font-mono text-danger" title={fmtVal(oldValue)}>
          {fmtVal(oldValue)}
        </span>
      )}
      {hasOld && hasNew && <ArrowRight className="h-3 w-3 shrink-0 text-ink/30" />}
      {hasNew && (
        <span className="max-w-[9rem] truncate rounded-md bg-accent-weak px-1.5 py-0.5 font-mono text-accent-700" title={fmtVal(newValue)}>
          {fmtVal(newValue)}
        </span>
      )}
    </div>
  );
}
