'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScrollText, ShieldCheck, Filter, RotateCcw, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { Role } from '@/lib/types';
import { fmtDateTime } from '@/lib/utils';
import { ROLE_LABEL } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/PageHeader';
import { Field, Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';

interface AuditEntry {
  id: number;
  action: string;
  entity: string;
  entityId?: string | number | null;
  userId?: number | null;
  user?: { firstName?: string; lastName?: string; roles?: Role[]; username?: string } | null;
  oldValue?: unknown;
  newValue?: unknown;
  exceptional?: boolean;
  createdAt: string;
}

interface Filters {
  action: string;
  entity: string;
  from: string;
  to: string;
}

const EMPTY: Filters = { action: '', entity: '', from: '', to: '' };

/** Représentation compacte et lisible d'une valeur d'audit. */
function compact(v: unknown): string {
  if (v === null || v === undefined || v === '') return '∅';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > 140 ? `${s.slice(0, 137)}…` : s;
  } catch {
    return String(v);
  }
}

function humanAction(a: string): string {
  return a
    .replace(/[_.]/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default function AuditPage() {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);

  const { data: actions } = useQuery({
    queryKey: ['audit', 'actions'],
    queryFn: async () => (await api.get<string[]>('/audit/actions')).data,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit', applied],
    queryFn: async () => {
      const params: Record<string, string> = { take: '200' };
      if (applied.action) params.action = applied.action;
      if (applied.entity) params.entity = applied.entity;
      if (applied.from) params.from = applied.from;
      if (applied.to) params.to = applied.to;
      return (await api.get<AuditEntry[]>('/audit', { params })).data;
    },
    placeholderData: keepPreviousData,
  });

  const rows = data ?? [];
  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));
  const applyFilters = () => setApplied(draft);
  const reset = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);

  return (
    <div>
      <PageHeader
        eyebrow="Commission de coordination"
        title="Journal d'audit fonctionnel"
        description="Traçabilité complète des actions métier de la plateforme."
      />

      <div className="mb-5 flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs text-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-subtle" />
        <span>
          <span className="font-semibold text-ink">RG-26</span> — le journal est en lecture seule et
          inaltérable ; aucune entrée ne peut être modifiée ni supprimée.
        </span>
      </div>

      {/* Filtres */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
          <Filter className="h-4 w-4 text-muted" /> Filtres
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Action">
            <Select value={draft.action} onChange={(e) => set({ action: e.target.value })}>
              <option value="">Toutes les actions</option>
              {(actions ?? []).map((a) => (
                <option key={a} value={a}>
                  {humanAction(a)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Entité">
            <Input
              value={draft.entity}
              onChange={(e) => set({ entity: e.target.value })}
              placeholder="ex. Session, Evaluation…"
            />
          </Field>
          <Field label="Du">
            <Input type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} />
          </Field>
          <Field label="Au">
            <Input type="date" value={draft.to} onChange={(e) => set({ to: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </Button>
          <Button size="sm" onClick={applyFilters} loading={isFetching && dirty}>
            Appliquer
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock label="Chargement du journal…" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Aucune entrée"
          description="Aucune action ne correspond à ces filtres. Ajustez la période ou l'entité recherchée."
        />
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* Desktop : tableau */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Date / heure</TH>
                  <TH>Utilisateur</TH>
                  <TH>Action</TH>
                  <TH>Entité</TH>
                  <TH>Détail</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((r) => {
                  const name = r.user
                    ? `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim() ||
                      r.user.username ||
                      '—'
                    : 'Système';
                  return (
                    <TR key={r.id}>
                      <TD className="whitespace-nowrap text-muted tabular">{fmtDateTime(r.createdAt)}</TD>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            first={r.user?.firstName}
                            last={r.user?.lastName}
                            className="h-8 w-8 text-xs"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{name}</p>
                            {r.user?.roles && r.user.roles.length > 0 && (
                              <p className="truncate text-xs text-subtle">{r.user.roles.map((x) => ROLE_LABEL[x]).join(' · ')}</p>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="neutral">{humanAction(r.action)}</Badge>
                          {r.exceptional && <Badge tone="warning">Exceptionnel</Badge>}
                        </div>
                      </TD>
                      <TD className="whitespace-nowrap">
                        <span className="font-medium text-ink">{r.entity}</span>
                        {r.entityId !== null && r.entityId !== undefined && (
                          <span className="ml-1 text-subtle">#{String(r.entityId)}</span>
                        )}
                      </TD>
                      <TD>
                        {r.oldValue === undefined && r.newValue === undefined ? (
                          <span className="text-subtle">—</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                            <span className="rounded-md bg-surface px-1.5 py-0.5 text-muted">
                              {compact(r.oldValue)}
                            </span>
                            <ArrowRight className="h-3 w-3 text-subtle" />
                            <span className="rounded-md bg-accent-weak px-1.5 py-0.5 text-accent-700">
                              {compact(r.newValue)}
                            </span>
                          </div>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          {/* Mobile : liste de cartes empilées */}
          <div className="space-y-3 md:hidden">
            {rows.map((r) => {
              const name = r.user
                ? `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim() ||
                  r.user.username ||
                  '—'
                : 'Système';
              return (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted tabular">{fmtDateTime(r.createdAt)}</span>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Badge tone="neutral">{humanAction(r.action)}</Badge>
                      {r.exceptional && <Badge tone="warning">Exceptionnel</Badge>}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2.5">
                    <Avatar
                      first={r.user?.firstName}
                      last={r.user?.lastName}
                      className="h-8 w-8 text-xs"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{name}</p>
                      {r.user?.roles && r.user.roles.length > 0 && (
                        <p className="truncate text-xs text-subtle">{r.user.roles.map((x) => ROLE_LABEL[x]).join(' · ')}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2 text-sm">
                    <span className="text-xs font-medium text-subtle">Entité</span>
                    <span className="font-medium text-ink">{r.entity}</span>
                    {r.entityId !== null && r.entityId !== undefined && (
                      <span className="text-xs text-subtle">#{String(r.entityId)}</span>
                    )}
                  </div>

                  {r.oldValue === undefined && r.newValue === undefined ? null : (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-xs">
                      <span className="max-w-full truncate rounded-md bg-surface px-1.5 py-0.5 text-muted">
                        {compact(r.oldValue)}
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-subtle" />
                      <span className="max-w-full truncate rounded-md bg-accent-weak px-1.5 py-0.5 text-accent-700">
                        {compact(r.newValue)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-right text-xs text-subtle">
            {rows.length} entrée{rows.length > 1 ? 's' : ''} affichée{rows.length > 1 ? 's' : ''}
          </p>
        </motion.div>
      )}
    </div>
  );
}
