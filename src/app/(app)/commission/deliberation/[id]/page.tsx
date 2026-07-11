'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  BadgeCheck,
  FileText,
  Download,
  ShieldAlert,
  ScrollText,
  ChevronDown,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { api, apiError } from '@/lib/api';
import type { DecisionType } from '@/lib/types';
import { fmtDate, fmtDateTime, cn } from '@/lib/utils';
import { studentName } from '@/lib/names';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingBlock, EmptyState } from '@/components/ui/Feedback';
import { SessionStatusBadge } from '@/components/ui/status';
import { StudentCard } from './StudentCard';
import { ReportModal } from './ReportModal';
import { ExceptionalModal, type ExceptionalPayload } from './ExceptionalModal';
import {
  criticalCount,
  downloadBlobResponse,
  SCOPE_LABEL,
  type CisnetScope,
  type ConsolidatedRow,
  type DeliberationReport,
  type DeliberationView,
} from './_helpers';

export default function DeliberationDetailPage() {
  const params = useParams();
  const sessionId = Number(params.id);
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['deliberation', sessionId],
    queryFn: async () =>
      (await api.get<DeliberationView>(`/deliberations/${sessionId}`)).data,
    enabled: !Number.isNaN(sessionId),
  });

  // Actions transverses
  const [reportOpen, setReportOpen] = useState(false);
  const [excOpen, setExcOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmValidate, setConfirmValidate] = useState(false);
  const [savingStudent, setSavingStudent] = useState<number | null>(null);
  const [busy, setBusy] = useState<'close' | 'validate' | 'exceptional' | null>(null);
  const [exportScope, setExportScope] = useState<CisnetScope | null>(null);

  const { data: report, isFetching: reportLoading } = useQuery({
    queryKey: ['deliberation', sessionId, 'report'],
    queryFn: async () =>
      (await api.get<DeliberationReport>(`/deliberations/${sessionId}/report`)).data,
    enabled: reportOpen && !Number.isNaN(sessionId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['deliberation', sessionId] });

  // Index décisions / injonctions
  const decisionByStudent = useMemo(() => {
    const m = new Map<number, DeliberationView['decisions'][number]>();
    (data?.decisions ?? []).forEach((d) => m.set(d.studentId, d));
    return m;
  }, [data]);

  const injunctionByStudent = useMemo(() => {
    const m = new Map<number, DeliberationView['injunctions'][number]>();
    (data?.injunctions ?? []).forEach((inj) => {
      if (!m.has(inj.studentId)) m.set(inj.studentId, inj);
    });
    return m;
  }, [data]);

  const regular = data?.consolidated.regular ?? [];
  const compensation = data?.consolidated.compensation ?? [];
  const allRows = useMemo(() => [...regular, ...compensation], [regular, compensation]);
  const session = data?.consolidated.session;
  const promotion = data?.consolidated.promotion;

  // État de progression (la délibération peut ne pas encore être ouverte → deliberation null)
  const closed = !!data?.deliberation?.closedAt;
  const published =
    session?.status === 'CLOTUREE' ||
    !!session?.resultsPublishedAt ||
    !!data?.deliberation?.validatedAt;
  const decisionsLocked = closed || published;

  // Stats
  const stats = useMemo(() => {
    const decisions = data?.decisions ?? [];
    return {
      total: allRows.length,
      admis: decisions.filter((d) => d.decision === 'ADMIS').length,
      ajournes: decisions.filter((d) => d.decision === 'AJOURNE').length,
      critical: criticalCount(allRows),
    };
  }, [data, allRows]);

  // ————— Mutations —————
  const saveDecision = async (studentId: number, decision: DecisionType, observation: string) => {
    setSavingStudent(studentId);
    try {
      await api.post(`/deliberations/${sessionId}/decisions`, { studentId, decision, observation });
      toast.success('Décision enregistrée.');
      invalidate();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSavingStudent(null);
    }
  };

  const closeDelib = async () => {
    setBusy('close');
    try {
      await api.post(`/deliberations/${sessionId}/close`);
      toast.success('Délibération clôturée. Le procès-verbal est disponible.');
      setConfirmClose(false);
      invalidate();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(null);
    }
  };

  const validateResults = async () => {
    setBusy('validate');
    try {
      await api.post(`/deliberations/${sessionId}/validate`);
      toast.success('Résultats définitifs validés et publiés aux étudiants.');
      setConfirmValidate(false);
      invalidate();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(null);
    }
  };

  const submitExceptional = async (payload: ExceptionalPayload) => {
    setBusy('exceptional');
    try {
      await api.post(`/deliberations/${sessionId}/exceptional`, payload);
      toast.success('Note modifiée (procédure exceptionnelle). Résultats recalculés.');
      setExcOpen(false);
      invalidate();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(null);
    }
  };

  const exportCisnet = async (scope: CisnetScope) => {
    setExportScope(scope);
    try {
      const res = await api.get<Blob>(`/exports/${sessionId}/cisnet`, {
        params: { scope },
        responseType: 'blob',
      });
      downloadBlobResponse(res, `cisnet_session_${sessionId}_${scope}.xlsx`);
      toast.success('Export CISNET téléchargé.');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setExportScope(null);
    }
  };

  // ————— Rendu —————
  if (Number.isNaN(sessionId)) {
    return <EmptyState title="Session introuvable" description="Identifiant de session invalide." />;
  }
  if (isLoading) return <LoadingBlock label="Chargement de la délibération…" />;
  if (isError || !data || !session) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Délibération indisponible"
        description={isError ? apiError(error) : 'Aucune donnée de délibération pour cette session.'}
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

  return (
    <div>
      <Link
        href="/commission/deliberation"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Délibérations
      </Link>

      <PageHeader
        eyebrow={promotion ? `${promotion.label}${promotion.code ? ` · ${promotion.code}` : ''}` : 'Délibération'}
        title={session.title}
        description={`Défense du ${fmtDate(session.date)}${session.room ? ` · ${session.room}` : ''} — ${session.academicYear}`}
        action={<SessionStatusBadge status={session.status} />}
      />

      {/* Bandeau d'état */}
      {published ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-weak px-4 py-2.5 text-sm text-accent-700">
          <BadgeCheck className="h-4 w-4 shrink-0" />
          Résultats définitifs publiés aux étudiants
          {session.resultsPublishedAt ? ` le ${fmtDateTime(session.resultsPublishedAt)}` : ''}. La
          délibération est verrouillée.
        </div>
      ) : closed ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-muted">
          <Lock className="h-4 w-4 shrink-0 text-subtle" />
          Délibération clôturée{data.deliberation.closedAt ? ` le ${fmtDateTime(data.deliberation.closedAt)}` : ''}.
          Validez les résultats pour les publier.
        </div>
      ) : null}

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Étudiants" value={stats.total} icon={Users} tone="violet" index={0} />
        <StatCard label="Admis" value={stats.admis} icon={CheckCircle2} tone="teal" index={1} />
        <StatCard label="Ajournés" value={stats.ajournes} icon={XCircle} tone="violet" index={2} />
        <StatCard
          label="Écarts critiques"
          value={stats.critical}
          icon={AlertTriangle}
          tone="danger"
          index={3}
          hint={stats.critical > 0 ? 'À examiner en séance' : 'Aucun écart critique'}
        />
      </div>

      {/* Barre d'actions */}
      <div className="card mb-8 flex flex-wrap items-center gap-3 p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmClose(true)}
          disabled={closed || published || session.status !== 'DELIBERATION'}
        >
          <Lock className="h-4 w-4" /> Clôturer la délibération
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setConfirmValidate(true)}
          disabled={!closed || published}
        >
          <BadgeCheck className="h-4 w-4" /> Valider les résultats définitifs
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
          <FileText className="h-4 w-4" /> Rapport de délibération
        </Button>

        <ExportDropdown
          onSelect={exportCisnet}
          loadingScope={exportScope}
          disabled={!published}
        />

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => setExcOpen(true)} disabled={published}>
            <ShieldAlert className="h-4 w-4" /> Procédure exceptionnelle
          </Button>
        </div>
      </div>

      {/* Sections étudiants (RG-22 : réguliers et compensation séparés) */}
      <StudentSection
        icon={UserRound}
        title="Étudiants réguliers"
        rows={regular}
        sessionId={sessionId}
        decisionByStudent={decisionByStudent}
        injunctionByStudent={injunctionByStudent}
        readOnly={decisionsLocked}
        savingStudent={savingStudent}
        onSave={saveDecision}
      />

      {compensation.length > 0 && (
        <StudentSection
          icon={ScrollText}
          title="Étudiants en compensation"
          subtitle="Session de rattrapage — délibérés séparément (RG-22)."
          rows={compensation}
          sessionId={sessionId}
          decisionByStudent={decisionByStudent}
          injunctionByStudent={injunctionByStudent}
          readOnly={decisionsLocked}
          savingStudent={savingStudent}
          onSave={saveDecision}
        />
      )}

      {/* Panneau injonctions */}
      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-surface text-muted">
            <ScrollText className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Injonctions du président</h3>
            <p className="text-sm text-muted">Consignes émises par le président du jury (lecture seule).</p>
          </div>
        </div>
        {(data.injunctions ?? []).length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Aucune injonction"
            description="Le président du jury n'a émis aucune injonction pour cette session."
          />
        ) : (
          <div className="grid gap-3">
            {data.injunctions.map((inj, i) => {
              const row = allRows.find((r) => r.studentId === inj.studentId);
              const who = row
                ? `${studentName(row)} · ${row.matricule}`
                : inj.student
                ? studentName({ lastName: inj.student.lastName ?? '', postnom: inj.student.postnom, firstName: inj.student.firstName ?? '' }) || inj.student.matricule
                : `Étudiant #${inj.studentId}`;
              return (
                <motion.div
                  key={inj.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card flex gap-3 border-l-2 border-l-line-strong p-4"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-subtle" strokeWidth={1.75} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{who}</span>
                      <Badge tone="neutral">{fmtDateTime(inj.createdAt)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{inj.text}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modales & confirmations */}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        report={report ?? null}
        loading={reportLoading}
      />
      <ExceptionalModal
        open={excOpen}
        onClose={() => setExcOpen(false)}
        students={allRows}
        saving={busy === 'exceptional'}
        onSubmit={submitExceptional}
      />
      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={closeDelib}
        title="Clôturer la délibération ?"
        description="La clôture fige les décisions et génère le procès-verbal. Vous pourrez ensuite valider les résultats définitifs."
        confirmLabel="Clôturer"
        tone="primary"
        loading={busy === 'close'}
      />
      <ConfirmDialog
        open={confirmValidate}
        onClose={() => setConfirmValidate(false)}
        onConfirm={validateResults}
        title="Valider et publier les résultats définitifs ?"
        description="Action irréversible (CU-14) : les résultats seront publiés aux étudiants et le jury notifié. La session passe au statut « Clôturée »."
        confirmLabel="Valider et publier"
        tone="danger"
        loading={busy === 'validate'}
      />
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
  sessionId,
  decisionByStudent,
  injunctionByStudent,
  readOnly,
  savingStudent,
  onSave,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  rows: ConsolidatedRow[];
  sessionId: number;
  decisionByStudent: Map<number, DeliberationView['decisions'][number]>;
  injunctionByStudent: Map<number, DeliberationView['injunctions'][number]>;
  readOnly: boolean;
  savingStudent: number | null;
  onSave: (studentId: number, decision: DecisionType, observation: string) => void;
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
            <div key={row.studentId}>
              <StudentCard
                row={row}
                index={i}
                decision={decisionByStudent.get(row.studentId)}
                injunction={injunctionByStudent.get(row.studentId)}
                readOnly={readOnly}
                saving={savingStudent === row.studentId}
                onSave={onSave}
              />
              <div className="mt-1.5 flex justify-end">
                <a
                  href={`/print/bulletin/${sessionId}/${row.studentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-surface hover:text-ink"
                >
                  <FileText className="h-3.5 w-3.5 text-subtle" strokeWidth={1.75} />
                  Bulletin (PDF)
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// —————————————————————————————————————
// Menu déroulant Export CISNET
// —————————————————————————————————————
function ExportDropdown({
  onSelect,
  loadingScope,
  disabled,
}: {
  onSelect: (scope: CisnetScope) => void;
  loadingScope: CisnetScope | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const scopes: CisnetScope[] = ['all', 'regular', 'compensation'];

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        loading={loadingScope !== null}
        disabled={disabled}
        title={disabled ? 'Disponible après validation des résultats (session clôturée).' : undefined}
      >
        <Download className="h-4 w-4" /> Exporter CISNET
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </Button>
      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="absolute left-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-paper p-1 shadow-card"
          >
            {scopes.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setOpen(false);
                  onSelect(s);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition hover:bg-surface hover:text-ink"
              >
                <Download className="h-4 w-4 text-subtle" />
                {SCOPE_LABEL[s]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
