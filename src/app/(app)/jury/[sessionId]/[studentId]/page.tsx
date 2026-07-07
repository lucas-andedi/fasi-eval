'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import type { AxiosError } from 'axios';
import { ArrowLeft, CheckCircle2, Clock, Lock, Save, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError } from '@/lib/api';
import { apiMutate } from '@/lib/offline';
import { studentName } from '@/lib/names';
import { fmtGrade, fmtTimer } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StudentStatusBadge } from '@/components/ui/status';
import { LoadingBlock } from '@/components/ui/Feedback';
import {
  ConfidentialityBanner,
  ProgressRing,
  clampGrade,
  isFilled,
  toNumber,
  type EvalCriterion,
  type EvaluationDetail,
} from '../../_shared';

export default function EvaluationFormPage() {
  const params = useParams<{ sessionId: string; studentId: string }>();
  const { sessionId, studentId } = params;
  const qc = useQueryClient();
  const queryKey = ['evaluation', sessionId, studentId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () =>
      (await api.get<EvaluationDetail>(`/evaluations/${sessionId}/${studentId}`)).data,
    enabled: !!sessionId && !!studentId,
  });

  /* Valeurs saisies : criterionId -> chaîne (permet les décimales). */
  const [values, setValues] = useState<Record<number, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const expiredFired = useRef(false);

  const draftKey = `fasi.evaldraft.${sessionId}.${studentId}`;

  // Hydrate les valeurs à la réception des données (les notes serveur), puis superpose
  // un éventuel brouillon local (saisie en cours conservée hors-ligne / après rechargement).
  useEffect(() => {
    if (!data) return;
    const map: Record<number, string> = {};
    for (const n of data.notes ?? []) map[n.criterionId] = String(n.value);
    if (data.status !== 'VERROUILLEE') {
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey) ?? 'null');
        if (draft && typeof draft === 'object') Object.assign(map, draft);
      } catch {
        /* brouillon illisible */
      }
    }
    setValues(map);
    expiredFired.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Persiste la saisie en cours localement (RG SA-06c) tant que l'évaluation est modifiable.
  useEffect(() => {
    if (!data || data.status === 'VERROUILLEE') return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(values));
    } catch {
      /* quota */
    }
  }, [values, data, draftKey]);

  const criteria = useMemo<EvalCriterion[]>(() => data?.criteria ?? [], [data]);
  const deadlineMs = data?.modificationDeadline ? new Date(data.modificationDeadline).getTime() : null;

  const inWindow = data?.status === 'VALIDEE' && deadlineMs !== null && deadlineMs > now;
  const remainingSec = deadlineMs !== null ? Math.max(0, Math.floor((deadlineMs - now) / 1000)) : 0;

  // Tic-tac de la fenêtre de modification (RG-09).
  useEffect(() => {
    if (!inWindow) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inWindow]);

  // À l'échéance : rafraîchir pour obtenir le statut VERROUILLEE côté serveur.
  useEffect(() => {
    if (
      data?.status === 'VALIDEE' &&
      deadlineMs !== null &&
      remainingSec === 0 &&
      !expiredFired.current
    ) {
      expiredFired.current = true;
      qc.invalidateQueries({ queryKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec === 0, data?.status]);

  // Verrouillé : VERROUILLEE, ou VALIDEE dont la fenêtre est close/absente (SA-07a).
  const locked =
    data?.status === 'VERROUILLEE' ||
    (data?.status === 'VALIDEE' && (deadlineMs === null || deadlineMs <= now));
  const editable = !!data && !locked;

  const filledCount = criteria.filter((c) => isFilled(values[c.id])).length;
  const allFilled = criteria.length > 0 && filledCount === criteria.length;

  const mutation = useMutation({
    mutationFn: async (validate: boolean) => {
      const notes = criteria
        .filter((c) => isFilled(values[c.id]))
        .map((c) => ({ criterionId: c.id, value: toNumber(values[c.id]) }));
      // Passe par la couche hors-ligne : si le réseau est coupé, la saisie est mise en
      // file d'attente et synchronisée au retour du réseau (RG SA-06c).
      return apiMutate('post', `/evaluations/${sessionId}/${studentId}`, { notes, validate }, {
        label: `Évaluation — ${student ? studentName(student) : ''}`.trim(),
      });
    },
    onSuccess: (res, validate) => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['my-students', sessionId] });
      if ((res as { queued?: boolean })?.queued) {
        toast('Enregistré hors-ligne — sera synchronisé au retour du réseau.');
        return;
      }
      // Saisie synchronisée : on peut effacer le brouillon local.
      try { localStorage.removeItem(`fasi.evaldraft.${sessionId}.${studentId}`); } catch {}
      toast.success(
        validate ? 'Évaluation validée. La fenêtre de modification est ouverte.' : 'Brouillon enregistré.',
      );
    },
    onError: (err) => {
      const status = (err as AxiosError)?.response?.status;
      if (status === 423) qc.invalidateQueries({ queryKey }); // notes verrouillées : resynchroniser
      toast.error(apiError(err));
    },
  });

  const setVal = (id: number, raw: string) => setValues((v) => ({ ...v, [id]: clampGrade(raw) }));

  const student = data?.student;
  const studentStatus = data?.studentStatus ?? student?.status ?? 'REGULIER';

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/jury/${sessionId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 transition hover:text-violet-700"
      >
        <ArrowLeft className="h-4 w-4" /> Étudiants à évaluer
      </Link>

      {isLoading ? (
        <LoadingBlock label="Chargement de l'évaluation…" />
      ) : isError || !data ? (
        <div className="card p-10 text-center">
          <p className="font-semibold text-ink">Impossible de charger cette évaluation</p>
          <p className="mt-1 text-sm text-ink/55">Vérifiez que cet étudiant vous est bien affecté.</p>
        </div>
      ) : (
        <>
          {/* En-tête étudiant */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card overflow-hidden p-0"
          >
            <div className="border-b border-line px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="truncate font-display text-2xl font-bold text-ink">
                    {student ? studentName(student) : ''}
                  </h1>
                  <p className="mt-1 font-mono text-sm text-muted">{student?.matricule}</p>
                </div>
                <StudentStatusBadge status={studentStatus} />
              </div>
            </div>
            <div className="grid gap-x-6 gap-y-3 px-6 py-4 text-sm sm:grid-cols-2">
              {student?.promotion && (
                <Meta label="Promotion" value={student.promotion.label} />
              )}
              {(student?.department || student?.option) && (
                <Meta
                  label="Département / Option"
                  value={[student?.department?.name, student?.option?.name].filter(Boolean).join(' · ') || '—'}
                />
              )}
              {student?.projectSubject && (
                <div className="sm:col-span-2">
                  <Meta label="Sujet du projet" value={student.projectSubject} />
                </div>
              )}
            </div>
          </motion.div>

          {/* Bandeau selon le statut */}
          <div className="mt-5">
            {locked ? (
              <LockedBanner />
            ) : inWindow ? (
              <CountdownBanner remainingSec={remainingSec} />
            ) : (
              <ConfidentialityBanner subtle />
            )}
          </div>

          {locked ? (
            <LockedNotes criteria={criteria} values={values} />
          ) : (
            <EditableForm
              criteria={criteria}
              values={values}
              setVal={setVal}
              filledCount={filledCount}
              allFilled={allFilled}
              saving={mutation.isPending}
              onSaveDraft={() => mutation.mutate(false)}
              onValidate={() => setConfirmOpen(true)}
              inWindow={!!inWindow}
            />
          )}

          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false);
              mutation.mutate(true);
            }}
            title="Valider mon évaluation ?"
            confirmLabel="Valider mon évaluation"
            tone="primary"
            loading={mutation.isPending}
            description={
              <>
                Après validation, une fenêtre de modification s'ouvre pendant quelques minutes (RG-09).
                Passé ce délai, vos notes seront <strong>définitivement verrouillées</strong> (RG-08).
                Vous pourrez encore les ajuster tant que le compte à rebours n'est pas terminé.
              </>
            }
          />
        </>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink/40">{label}</p>
      <p className="mt-0.5 font-medium text-ink">{value}</p>
    </div>
  );
}

/* ————————————————————————————— Bandeaux ————————————————————————————— */

function CountdownBanner({ remainingSec }: { remainingSec: number }) {
  const urgent = remainingSec <= 120; // RG-09c : passe en warning sous 2 min
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5"
    >
      <span className={urgent ? 'shrink-0 text-warning' : 'shrink-0 text-muted'}>
        <Clock className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Fenêtre de modification ouverte</p>
        <p className="text-xs text-muted">
          Vos notes restent modifiables. Elles se verrouilleront à la fin du compte à rebours.
        </p>
      </div>
      <span
        className={
          urgent
            ? 'font-mono text-2xl font-bold text-warning tabular'
            : 'font-mono text-2xl font-bold text-ink tabular'
        }
      >
        {fmtTimer(remainingSec)}
      </span>
    </motion.div>
  );
}

function LockedBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5"
    >
      <span className="mt-0.5 shrink-0 text-muted">
        <Lock className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">Notes verrouillées</p>
        <p className="mt-0.5 text-xs text-muted">
          La fenêtre de modification est close. Contactez la Commission pour une procédure exceptionnelle
          (SA-07a).
        </p>
      </div>
    </motion.div>
  );
}

/* ————————————————————————————— Formulaire éditable ————————————————————————————— */

function EditableForm({
  criteria,
  values,
  setVal,
  filledCount,
  allFilled,
  saving,
  onSaveDraft,
  onValidate,
  inWindow,
}: {
  criteria: EvalCriterion[];
  values: Record<number, string>;
  setVal: (id: number, raw: string) => void;
  filledCount: number;
  allFilled: boolean;
  saving: boolean;
  onSaveDraft: () => void;
  onValidate: () => void;
  inWindow: boolean;
}) {
  return (
    <>
      {/* Progression */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mt-5 flex items-center gap-6 p-6"
      >
        <ProgressRing filled={filledCount} total={criteria.length} />
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-ink">Grille d'évaluation</h2>
          <p className="mt-1 text-sm text-ink/55">
            Notez chaque critère de 0 à 20 (les demi-points sont acceptés). Tous les critères doivent être
            renseignés avant de valider (RG-08).
          </p>
          {allFilled && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> Tous les critères sont renseignés
            </p>
          )}
        </div>
      </motion.div>

      {/* Critères */}
      <div className="mt-5 space-y-3">
        {criteria.map((c, i) => (
          <CriterionRow key={c.id} criterion={c} index={i} value={values[c.id] ?? ''} onChange={(raw) => setVal(c.id, raw)} />
        ))}
      </div>

      {/* Actions */}
      <div className="sticky bottom-4 z-10 mt-6">
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink/55">
            {allFilled ? (
              <span className="font-medium text-ink">Prêt à valider.</span>
            ) : (
              <>
                <span className="font-semibold text-ink">{filledCount}</span>/{criteria.length} critères
                renseignés
              </>
            )}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onSaveDraft} loading={saving}>
              <Save className="h-4 w-4" /> Enregistrer le brouillon
            </Button>
            <Button variant="primary" onClick={onValidate} disabled={!allFilled || saving}>
              <ShieldCheck className="h-4 w-4" /> Valider mon évaluation
            </Button>
          </div>
        </div>
        {inWindow && (
          <p className="mt-2 text-center text-xs text-ink/45">
            Revalider met à jour vos notes tant que la fenêtre est ouverte.
          </p>
        )}
      </div>
    </>
  );
}

function CriterionRow({
  criterion,
  index,
  value,
  onChange,
}: {
  criterion: EvalCriterion;
  index: number;
  value: string;
  onChange: (raw: string) => void;
}) {
  const filled = isFilled(value);
  const num = toNumber(value);
  const pct = (num / 20) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="card p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface text-xs font-bold text-muted">
            {criterion.number}
          </span>
          <p className="pt-0.5 text-sm font-semibold text-ink">{criterion.label}</p>
        </div>
        <div className="flex shrink-0 items-baseline gap-1">
          <span className="font-mono text-2xl font-bold tabular text-ink">
            {filled ? fmtGrade(num) : '—'}
          </span>
          <span className="text-xs font-semibold text-subtle">/20</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={20}
          step={0.5}
          value={filled ? num : 0}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Note du critère ${criterion.number}`}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full accent-accent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-soft"
          style={{
            background: filled
              ? `linear-gradient(90deg, #0d9268 0%, #0d9268 ${pct}%, #e8e8e6 ${pct}%, #e8e8e6 100%)`
              : '#e8e8e6',
          }}
        />
        <div className="w-24 shrink-0">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            max={20}
            step={0.5}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => onChange(clampGrade(e.target.value))}
            placeholder="0–20"
            className="h-10 text-center font-semibold tabular"
            aria-label={`Saisie de la note du critère ${criterion.number}`}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ————————————————————————————— Vue verrouillée (lecture seule) ————————————————————————————— */

function LockedNotes({
  criteria,
  values,
}: {
  criteria: EvalCriterion[];
  values: Record<number, string>;
}) {
  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted">
        <ShieldAlert className="h-4 w-4 text-subtle" />
        <span>Consultation en lecture seule de vos notes verrouillées.</span>
      </div>
      <AnimatePresence>
        {criteria.map((c, i) => {
          const filled = isFilled(values[c.id]);
          const num = toNumber(values[c.id]);
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card-flat flex items-center justify-between gap-4 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface text-xs font-bold text-muted">
                  {c.number}
                </span>
                <p className="truncate text-sm font-semibold text-ink">{c.label}</p>
              </div>
              <div className="flex shrink-0 items-baseline gap-1">
                <span className="font-mono text-xl font-bold tabular text-ink">
                  {filled ? fmtGrade(num) : '—'}
                </span>
                <span className="text-xs font-semibold text-subtle">/20</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
