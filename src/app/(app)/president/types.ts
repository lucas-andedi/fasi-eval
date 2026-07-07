// Types co-localisés à l'espace Président du jury (« Salle de contrôle »).
// Miroir défensif des réponses backend décrites dans docs/API.md
// (sections Timer/Chronomètre, Sessions, Délibération & Résultats).
import type { Severity, StudentStatus, TimerStateT } from '@/lib/types';

/** GET /timers/:sessionId/:studentId → état du chronomètre. */
export interface TimerState {
  state: TimerStateT;
  configuredSec: number;
  remainingSec: number;
  operatorId?: number | null;
  updatedAt?: string | null;
}

/** Réponse défensive : le backend peut renvoyer l'objet à plat ou sous `timer`. */
export function readTimer(raw: unknown, fallbackConfigured: number): TimerState {
  const r = (raw ?? {}) as Record<string, unknown>;
  const t = (r.timer ?? r) as Record<string, unknown>;
  const state = (t.state as TimerStateT) ?? 'EN_ATTENTE';
  const configuredSec = num(t.configuredSec, num(t.durationSec, fallbackConfigured));
  const remainingSec = num(t.remainingSec, configuredSec);
  return { state, configuredSec, remainingSec };
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Une moyenne par critère (consolidé / résultats étudiant). */
export interface CriterionAverage {
  criterionId?: number;
  number?: number;
  label?: string;
  average: number;
}

/** Un écart détecté sur un critère (anonymisé — RG-11). */
export interface Discrepancy {
  criterionId?: number;
  number?: number;
  label?: string;
  severity: Severity;
  gap?: number;
}

/** GET /results/:sessionId/consolidated → une ligne par étudiant (ANONYMISÉ). */
export interface ConsolidatedRow {
  studentId: number;
  firstName?: string;
  lastName?: string;
  postnom?: string | null;
  matricule?: string;
  status?: StudentStatus;
  finalGrade?: number | null;
  criterionAverages?: CriterionAverage[];
  discrepancies?: Discrepancy[];
  student?: {
    id?: number;
    firstName?: string;
    lastName?: string;
    postnom?: string | null;
    matricule?: string;
  };
}

/** GET /results/:sessionId/consolidated (sections réguliers/compensation). */
export interface Consolidated {
  regular?: ConsolidatedRow[];
  compensation?: ConsolidatedRow[];
}

/** Une injonction officielle (CU-12). */
export interface Injunction {
  id: number;
  studentId: number;
  text: string;
  createdAt?: string;
  authorName?: string;
}

/** GET /deliberations/:sessionId → vue délibération. */
export interface DeliberationView {
  deliberation?: { id?: number; status?: string } | null;
  injunctions?: Injunction[];
  consolidated?: Consolidated;
}

// ————— Accesseurs défensifs —————

export function rowFirstName(r: ConsolidatedRow): string {
  return r.firstName ?? r.student?.firstName ?? '';
}
export function rowLastName(r: ConsolidatedRow): string {
  return r.lastName ?? r.student?.lastName ?? '';
}
export function rowPostnom(r: ConsolidatedRow): string | null {
  return r.postnom ?? r.student?.postnom ?? null;
}
export function rowMatricule(r: ConsolidatedRow): string {
  return r.matricule ?? r.student?.matricule ?? '';
}
export function rowStudentId(r: ConsolidatedRow): number {
  return r.studentId ?? r.student?.id ?? 0;
}

/** Libellés & actions du chronomètre selon l'état courant. */
export const TIMER_STATE_LABEL: Record<TimerStateT, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  SUSPENDU: 'Suspendu',
  TERMINE: 'Temps écoulé',
};
