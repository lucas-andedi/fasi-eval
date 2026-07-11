'use client';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import type {
  DefenseSession,
  EvaluationStatus,
  Promotion,
  Student,
  StudentStatus,
} from '@/lib/types';

/* ————————————————————————————————————————————————————————————
   Types spécifiques à l'espace « saisie des évaluations » (jury).
   Modelés sur le contrat d'API (docs/API.md · section Evaluations).
   ———————————————————————————————————————————————————————————— */

/** GET /sessions/mine — une session où le membre est affecté. */
export interface MineSession extends DefenseSession {
  promotion?: Promotion;
  isPresident?: boolean;
  juryCount?: number;
  studentCount?: number;
  _count?: { jury?: number; students?: number };
}

/** GET /evaluations/my-students — un étudiant + le statut de MON évaluation (RG-10). */
export interface MyStudentRow {
  studentId: number;
  student?: Student;
  matricule?: string;
  firstName?: string;
  lastName?: string;
  postnom?: string | null;
  /** Statut de MON évaluation pour cet étudiant. */
  status: EvaluationStatus;
  /** Statut de l'étudiant dans la session (régulier / compensation). */
  studentStatus?: StudentStatus;
  submittedCount?: number;
  totalCriteria?: number;
}

export interface EvalCriterion {
  id: number;
  number: number;
  label: string;
}
export interface EvalNote {
  criterionId: number;
  value: number;
  comment?: string | null;
}

/** GET /evaluations/:sessionId/:studentId — MON évaluation d'un étudiant. */
export interface EvaluationDetail {
  status: EvaluationStatus;
  modificationDeadline?: string | null;
  criteria: EvalCriterion[];
  notes: EvalNote[];
  student: Student & { status?: StudentStatus };
  session?: DefenseSession & { promotion?: Promotion };
  studentStatus?: StudentStatus;
}

/* ————————————————————————————————— Helpers ————————————————————————————————— */

/** Nombre affiché à partir d'un enregistrement counts hétérogène. */
export function countJury(s: MineSession): number | undefined {
  return s.juryCount ?? s._count?.jury;
}
export function countStudents(s: MineSession): number | undefined {
  return s.studentCount ?? s._count?.students;
}

/** RG-07 : borne une saisie dans [0..20], accepte les décimales. */
export function clampGrade(raw: string): string {
  if (raw.trim() === '') return '';
  const n = parseFloat(raw.replace(',', '.'));
  if (Number.isNaN(n)) return '';
  const clamped = Math.min(20, Math.max(0, n));
  // Préserve la saisie brute tant qu'elle reste dans la borne (ex. « 12. »).
  if (clamped === n && /^\d*[.,]?\d*$/.test(raw.trim())) return raw.trim();
  return String(clamped);
}

export function isFilled(v: string | undefined): boolean {
  return v !== undefined && v.trim() !== '' && !Number.isNaN(parseFloat(v.replace(',', '.')));
}

export function toNumber(v: string | undefined): number {
  if (!isFilled(v)) return 0;
  return parseFloat((v as string).replace(',', '.'));
}

/* ————————————————————————————————— Composants partagés ————————————————————————————————— */

/** RG-10 — rappel de confidentialité, présent sur chaque écran du flux. */
export function ConfidentialityBanner({ subtle = false }: { subtle?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5"
    >
      <span className="mt-0.5 shrink-0 text-muted">
        <ShieldCheck className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">Vos notes sont strictement confidentielles</p>
        {!subtle && (
          <p className="mt-0.5 text-xs text-muted">
            Elles ne sont jamais visibles par les autres membres du jury. La consolidation reste anonyme
            jusqu'à la délibération.
          </p>
        )}
      </div>
    </motion.div>
  );
}

/** Anneau de progression « X / Y critères renseignés ». */
export function ProgressRing({
  filled,
  total,
  size = 116,
}: {
  filled: number;
  total: number;
  size?: number;
}) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? filled / total : 0;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line-strong))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="font-display text-2xl font-extrabold text-ink tabular">
          {filled}
          <span className="text-subtle">/{total}</span>
        </span>
        <span className="text-[11px] font-semibold text-muted">critères</span>
      </div>
    </div>
  );
}

/** Petite barre de progression linéaire (lignes d'étudiants). */
export function MiniProgress({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const done = total > 0 && filled >= total;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.6 }}
          className={done ? 'h-full rounded-full bg-success' : 'h-full rounded-full bg-accent'}
        />
      </div>
      <span className="text-xs font-semibold text-muted tabular">
        {filled}/{total}
      </span>
    </div>
  );
}
