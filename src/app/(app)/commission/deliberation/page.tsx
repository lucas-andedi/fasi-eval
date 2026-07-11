'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Gavel, CalendarClock, GraduationCap, ArrowRight, Search, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import type { SessionStatus } from '@/lib/types';
import { fmtDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { SessionStatusBadge } from '@/components/ui/status';

/** Ligne de session renvoyée par GET /sessions (counts + promotion). */
interface SessionRow {
  id: number;
  title: string;
  date: string;
  startTime: string;
  room: string;
  status: SessionStatus;
  academicYear: string;
  promotion?: { id: number; code: string; label: string } | null;
  studentCount?: number;
  _count?: { students?: number; jury?: number };
}

/** Promotion renvoyée par GET /reference/promotions. */
interface PromotionRow {
  id: number;
  code: string;
  label: string;
}

const DELIB_STATUSES: SessionStatus[] = ['DELIBERATION', 'CLOTUREE'];

export default function DeliberationListPage() {
  const [tab, setTab] = useState<'ALL' | SessionStatus>('ALL');
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', 'deliberation'],
    queryFn: async () => (await api.get<SessionRow[]>('/sessions')).data,
  });

  const { data: promotions, isLoading: promosLoading } = useQuery({
    queryKey: ['reference', 'promotions'],
    queryFn: async () => (await api.get<PromotionRow[]>('/reference/promotions')).data,
  });

  const eligible = useMemo(
    () => (data ?? []).filter((s) => DELIB_STATUSES.includes(s.status)),
    [data],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return eligible
      .filter((s) => (tab === 'ALL' ? true : s.status === tab))
      .filter((s) =>
        term
          ? [s.title, s.promotion?.label, s.promotion?.code, s.room, s.academicYear]
              .filter(Boolean)
              .some((v) => v!.toLowerCase().includes(term))
          : true,
      );
  }, [eligible, tab, q]);

  const counts = useMemo(
    () => ({
      ALL: eligible.length,
      DELIBERATION: eligible.filter((s) => s.status === 'DELIBERATION').length,
      CLOTUREE: eligible.filter((s) => s.status === 'CLOTUREE').length,
    }),
    [eligible],
  );

  const studentsOf = (s: SessionRow) => s.studentCount ?? s._count?.students;

  return (
    <div>
      <PageHeader
        eyebrow="Commission de coordination"
        title="Délibérations"
        description="Consolidez les résultats, arrêtez les décisions du jury et publiez les délibérations définitives."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as 'ALL' | SessionStatus)}
          tabs={[
            { value: 'ALL', label: 'Toutes', count: counts.ALL },
            { value: 'DELIBERATION', label: 'En délibération', count: counts.DELIBERATION },
            { value: 'CLOTUREE', label: 'Clôturées', count: counts.CLOTUREE },
          ]}
        />
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une session…"
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock label="Chargement des sessions…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="Aucune session à délibérer"
          description="Les sessions apparaissent ici dès qu'elles passent en délibération. Ouvrez une session depuis « Sessions de défense »."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={`/commission/deliberation/${s.id}`}
                className="card group flex h-full flex-col gap-4 p-5 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-muted">
                    <Gavel className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <SessionStatusBadge status={s.status} />
                </div>

                <div>
                  <h3 className="font-display text-lg font-bold text-ink">{s.title}</h3>
                  {s.promotion && (
                    <p className="mt-0.5 text-sm text-muted">
                      {s.promotion.label}
                      {s.promotion.code ? ` · ${s.promotion.code}` : ''}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-subtle" strokeWidth={1.75} />
                    {fmtDate(s.date)}
                  </span>
                  {studentsOf(s) !== undefined && (
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-subtle" strokeWidth={1.75} />
                      {studentsOf(s)} étudiant{(studentsOf(s) ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-line pt-3 text-sm font-semibold text-accent-700">
                  <span>Gérer la délibération</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Délibération par promotion */}
      <section className="mt-12">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-surface text-muted">
            <Layers className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Délibérer par promotion</h2>
            <p className="text-sm text-muted">
              Consolidez toutes les sessions d'une promotion en une seule délibération.
            </p>
          </div>
        </div>

        {promosLoading ? (
          <LoadingBlock label="Chargement des promotions…" />
        ) : !promotions || promotions.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Aucune promotion"
            description="Créez une promotion depuis « Promotions » pour délibérer à cette échelle."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {promotions.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={`/commission/deliberation/promotion/${p.id}`}
                  className="card group flex h-full flex-col gap-4 p-5 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-muted">
                      <Layers className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <span className="chip bg-surface text-muted border border-line">{p.code}</span>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">{p.label}</h3>
                    <p className="mt-0.5 text-sm text-muted">Toutes sessions confondues</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-sm font-semibold text-accent-700">
                    <span>Délibérer la promotion</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
