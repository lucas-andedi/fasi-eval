'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Scale,
  AlertTriangle,
  UserRound,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
import { api, apiError } from '@/lib/api';
import type { DecisionType, Severity } from '@/lib/types';
import { fmtDate, fmtGrade } from '@/lib/utils';
import { studentName } from '@/lib/names';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { DecisionBadge, SessionStatusBadge } from '@/components/ui/status';
import type { SessionStatus } from '@/lib/types';

// ————————————————————————————————————————————————
// Types — miroir de GET /deliberations/promotion/:promotionId
// ————————————————————————————————————————————————

interface PromotionRow {
  studentId: number;
  matricule: string;
  firstName: string;
  postnom?: string | null;
  lastName: string;
  finalGrade: number | null;
  criterionAverages: { criterionId: number; criterionLabel: string; average: number | null }[];
  discrepancies: { criterionId?: number; severity: Severity; stdDev?: number; absDiff?: number }[];
  comments: { criterionId: number; criterionLabel: string; comment: string }[];
  sessionId: number;
  sessionTitle: string;
  decision: DecisionType | null;
  observation: string | null;
}

interface PromotionDeliberation {
  promotion: { id: number; code: string; label: string };
  sessions: { id: number; title: string; date: string; status: SessionStatus }[];
  regular: PromotionRow[];
  compensation: PromotionRow[];
  stats: {
    total: number;
    admis: number;
    ajournes: number;
    compensation: number;
    discrepancyN1: number;
    discrepancyN2: number;
    moyenne: number | null;
  };
}

export default function PromotionDeliberationPage() {
  const params = useParams();
  const promotionId = Number(params.promotionId);
  const qc = useQueryClient();
  const queryKey = ['deliberation', 'promotion', promotionId] as const;

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () =>
      (await api.get<PromotionDeliberation>(`/deliberations/promotion/${promotionId}`)).data,
    enabled: !Number.isNaN(promotionId),
  });

  const [savingStudent, setSavingStudent] = useState<number | null>(null);

  const saveDecision = async (
    row: PromotionRow,
    decision: DecisionType,
    observation: string,
  ) => {
    setSavingStudent(row.studentId);
    try {
      await api.post(`/deliberations/${row.sessionId}/decisions`, {
        studentId: row.studentId,
        decision,
        observation,
      });
      toast.success('Décision enregistrée.');
      qc.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSavingStudent(null);
    }
  };

  if (Number.isNaN(promotionId)) {
    return <EmptyState title="Promotion introuvable" description="Identifiant de promotion invalide." />;
  }
  if (isLoading) return <LoadingBlock label="Chargement de la délibération…" />;
  if (isError || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Délibération indisponible"
        description={isError ? apiError(error) : 'Aucune donnée de délibération pour cette promotion.'}
        action={
          <Link href="/commission/deliberation">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" /> Retour aux délibérations
            </Button>
          </Link>
        }
      />
    );
  }

  const { promotion, sessions, regular, compensation, stats } = data;

  return (
    <div>
      <Link
        href="/commission/deliberation"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Délibérations
      </Link>

      <PageHeader
        eyebrow="Délibération par promotion"
        title={promotion.label}
        description={`${promotion.code} · ${sessions.length} session${sessions.length > 1 ? 's' : ''} de défense — décisions consolidées pour toute la promotion.`}
      />

      {/* Sessions couvertes */}
      {sessions.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {sessions.map((s) => (
            <span
              key={s.id}
              className="inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-muted"
            >
              <span className="min-w-0 truncate max-w-[9rem] font-medium text-ink sm:max-w-[16rem]">{s.title}</span>
              <span className="shrink-0 text-subtle">· {fmtDate(s.date)}</span>
              <SessionStatusBadge status={s.status} />
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Étudiants" value={stats.total} icon={Users} tone="violet" index={0} />
        <StatCard label="Admis" value={stats.admis} icon={CheckCircle2} tone="teal" index={1} />
        <StatCard label="Ajournés" value={stats.ajournes} icon={XCircle} tone="danger" index={2} />
        <StatCard label="Compensation" value={stats.compensation} icon={Scale} tone="gold" index={3} />
        <StatCard
          label="Écarts"
          value={stats.discrepancyN1 + stats.discrepancyN2}
          icon={AlertTriangle}
          tone="danger"
          index={4}
          hint={
            stats.discrepancyN2 > 0
              ? `${stats.discrepancyN2} critique${stats.discrepancyN2 > 1 ? 's' : ''} · ${stats.discrepancyN1} attention`
              : stats.discrepancyN1 > 0
              ? `${stats.discrepancyN1} à surveiller`
              : 'Aucun écart signalé'
          }
        />
      </div>

      {/* Étudiants réguliers */}
      <StudentSection
        icon={UserRound}
        title="Étudiants réguliers"
        rows={regular}
        savingStudent={savingStudent}
        onSave={saveDecision}
      />

      {compensation.length > 0 && (
        <StudentSection
          icon={ScrollText}
          title="Étudiants en compensation"
          subtitle="Session de rattrapage — délibérés séparément (RG-22)."
          rows={compensation}
          savingStudent={savingStudent}
          onSave={saveDecision}
        />
      )}
    </div>
  );
}

// —————————————————————————————————————
// Section d'étudiants
// —————————————————————————————————————
function StudentSection({
  icon: Icon,
  title,
  subtitle,
  rows,
  savingStudent,
  onSave,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  rows: PromotionRow[];
  savingStudent: number | null;
  onSave: (row: PromotionRow, decision: DecisionType, observation: string) => void;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-surface text-muted">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-ink">
            {title} <span className="text-subtle">({rows.length})</span>
          </h3>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucun étudiant" description="Aucun étudiant dans cette catégorie." />
      ) : (
        <div className="grid gap-3">
          {rows.map((row, i) => (
            <PromotionStudentCard
              key={row.studentId}
              row={row}
              index={i}
              saving={savingStudent === row.studentId}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// —————————————————————————————————————
// Carte étudiant : décision + observation + bulletin
// —————————————————————————————————————
const OPTIONS: { value: DecisionType; label: string; active: string }[] = [
  { value: 'ADMIS', label: 'Admis', active: 'bg-accent text-white' },
  { value: 'AJOURNE', label: 'Ajourné', active: 'bg-danger text-white' },
  { value: 'COMPENSATION', label: 'Compensation', active: 'bg-warning text-white' },
];

function PromotionStudentCard({
  row,
  index,
  saving,
  onSave,
}: {
  row: PromotionRow;
  index: number;
  saving: boolean;
  onSave: (row: PromotionRow, decision: DecisionType, observation: string) => void;
}) {
  const [choice, setChoice] = useState<DecisionType | ''>(row.decision ?? '');
  const [obs, setObs] = useState(row.observation ?? '');

  const dirty = choice !== (row.decision ?? '') || obs !== (row.observation ?? '');
  const critical = row.discrepancies.filter((d) => d.severity === 'NIVEAU_2').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="card overflow-hidden p-0"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        {/* Identité */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-base font-bold text-ink">{studentName(row)}</h4>
            {row.decision && <DecisionBadge decision={row.decision} />}
          </div>
          <p className="mt-0.5 font-mono text-xs text-subtle">{row.matricule}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{row.sessionTitle}</Badge>
            {critical > 0 && (
              <Badge tone="danger" dot>
                {critical} écart{critical > 1 ? 's' : ''} critique{critical > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Note finale */}
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold text-subtle">Note finale</p>
          <p className="font-mono text-3xl font-bold tabular text-ink">
            {fmtGrade(row.finalGrade)}
            <span className="text-base font-semibold text-subtle">/20</span>
          </p>
        </div>
      </div>

      {/* Contrôle de décision */}
      <div className="border-t border-line px-5 py-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex flex-wrap gap-1.5">
              {OPTIONS.map((o) => {
                const active = choice === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setChoice(o.value)}
                    className={
                      'rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition ' +
                      (active
                        ? `border-transparent ${o.active}`
                        : 'border-line bg-paper text-muted hover:bg-surface')
                    }
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <a
              href={`/print/bulletin/${row.sessionId}/${row.studentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface"
            >
              <ScrollText className="h-4 w-4 text-subtle" strokeWidth={1.75} />
              Bulletin (PDF)
            </a>
          </div>
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Observation de la commission (facultatif)…"
            className="min-h-[64px]"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!choice || !dirty}
              loading={saving}
              onClick={() => choice && onSave(row, choice, obs)}
            >
              Enregistrer la décision
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
