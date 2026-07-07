'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, Award, Lock, ShieldCheck } from 'lucide-react';
import { SeverityBadge, StudentStatusBadge } from '@/components/ui/status';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { api } from '@/lib/api';
import { cn, fmtGrade } from '@/lib/utils';
import {
  type Consolidated,
  type ConsolidatedRow,
  rowFirstName,
  rowLastName,
  rowPostnom,
  rowMatricule,
  rowStudentId,
} from '../types';
import { studentName } from '@/lib/names';

export function ConsolidatedPanel({ sessionId }: { sessionId: number }) {
  const q = useQuery({
    queryKey: ['consolidated', sessionId],
    retry: false,
    queryFn: async () => (await api.get<Consolidated>(`/results/${sessionId}/consolidated`)).data,
  });

  if (q.isLoading) return <LoadingBlock label="Consolidation des notes…" />;

  const data = q.data;
  const regular = data?.regular ?? [];
  const compensation = data?.compensation ?? [];
  const total = regular.length + compensation.length;

  if (q.isError || total === 0) {
    return (
      <EmptyState
        icon={Award}
        title="Résultats non disponibles"
        description="Les résultats consolidés apparaîtront ici dès que des évaluations auront été soumises par le jury."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-subtle" />
        <span>
          Vue <strong className="font-semibold text-ink">anonymisée</strong> : seules les moyennes consolidées sont affichées, jamais la note d'un
          évaluateur en particulier (RG-11).
        </span>
      </div>

      {regular.length > 0 && (
        <Section title="Étudiants réguliers" rows={regular} />
      )}
      {compensation.length > 0 && (
        <Section title="Étudiants en compensation" rows={compensation} gold />
      )}
    </div>
  );
}

function Section({ title, rows, gold }: { title: string; rows: ConsolidatedRow[]; gold?: boolean }) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
        {title}
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">{rows.length}</span>
      </h3>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {rows.map((r, i) => (
          <ResultCard key={rowStudentId(r) || i} row={r} index={i} gold={gold} />
        ))}
      </div>
    </div>
  );
}

function ResultCard({ row, index, gold }: { row: ConsolidatedRow; index: number; gold?: boolean }) {
  const grade = row.finalGrade;
  const averages = row.criterionAverages ?? [];
  const discrepancies = row.discrepancies ?? [];
  const gradeTone =
    grade == null ? 'text-subtle' : grade >= 14 ? 'text-success' : grade >= 10 ? 'text-warning' : 'text-danger';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="card p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar first={rowFirstName(row)} last={rowLastName(row)} className="h-11 w-11 rounded-xl text-sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {studentName({ lastName: rowLastName(row), postnom: rowPostnom(row), firstName: rowFirstName(row) })}
            </p>
            <p className="truncate text-xs text-muted">{rowMatricule(row)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn('font-display text-3xl font-extrabold tabular leading-none', gradeTone)}>
            {fmtGrade(grade)}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-subtle">/ 20</p>
        </div>
      </div>

      {discrepancies.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          {discrepancies.map((d, di) => (
            <SeverityBadge key={di} severity={d.severity} />
          ))}
        </div>
      )}

      {averages.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-line pt-4">
          {averages.map((a, ai) => {
            const pct = Math.max(0, Math.min(100, (a.average / 20) * 100));
            return (
              <div key={a.criterionId ?? ai} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs text-muted">
                  {a.number != null ? `${a.number}. ` : ''}
                  {a.label ?? `Critère ${a.criterionId ?? ai + 1}`}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + ai * 0.03, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-accent"
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs font-semibold tabular text-ink">
                  {fmtGrade(a.average)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <StudentStatusBadge status={gold ? 'COMPENSATION' : row.status ?? 'REGULIER'} />
        {grade != null && (
          <span className="inline-flex items-center gap-1 text-[11px] text-subtle">
            <Lock className="h-3 w-3" /> consolidé
          </span>
        )}
      </div>
    </motion.div>
  );
}
