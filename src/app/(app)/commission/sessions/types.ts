// Types locaux aux pages « Sessions de défense » (co-localisés).
// Miroir défensif des réponses backend décrites dans docs/API.md, section Sessions.
import type {
  DefenseSession,
  Promotion,
  Role,
  Student,
  StudentStatus,
} from '@/lib/types';

/** GET /sessions → SessionRow[] (counts jury/étudiants + promotion). */
export interface SessionRow extends DefenseSession {
  promotion?: Promotion;
  // Le backend peut renvoyer des compteurs à plat ou sous _count : on gère les deux.
  juryCount?: number;
  studentCount?: number;
  _count?: { jury?: number; students?: number };
}

/** Un membre du jury tel qu'exposé dans SessionDetail.jury[]. */
export interface JuryMember {
  userId: number;
  isPresident: boolean;
  isTimerDelegate?: boolean;
  // Champs éventuellement à plat ou imbriqués sous `user`.
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: Role[];
  user?: {
    id?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    roles?: Role[];
  };
}

/** Un étudiant inscrit à une session (SessionDetail.regular[] / compensation[]). */
export interface SessionStudent extends Student {
  status?: StudentStatus;
  originYear?: number | null;
}

/** GET /sessions/:id → SessionDetail. */
export interface SessionDetail extends DefenseSession {
  promotion?: Promotion;
  jury?: JuryMember[];
  regular?: SessionStudent[];
  compensation?: SessionStudent[];
  activeGrid?: {
    activeCriteria?: number[];
    appliedAt?: string | null;
  } | null;
}

/** GET /sessions/:id/criteria et PUT /sessions/:id/criteria. */
export interface SessionCriteriaResponse {
  useCustomCriteria: boolean;
  criteria: { id: number; number: number; label: string }[];
}

/** Un item de suivi temps réel (dashboard.perStudentStatus[]). */
export interface DashboardStudent {
  studentId?: number;
  id?: number;
  firstName?: string;
  lastName?: string;
  postnom?: string | null;
  matricule?: string;
  student?: Student;
  submitted?: number;
  total?: number;
  expected?: number;
  hasDiscrepancy?: boolean;
  discrepancy?: boolean;
  discrepancyCount?: number;
}

/** GET /sessions/:id/dashboard. */
export interface SessionDashboard {
  evaluationsSubmitted?: number;
  submittedEvaluations?: number;
  expected?: number;
  expectedEvaluations?: number;
  discrepancies?: number;
  discrepancyCount?: number;
  perStudentStatus?: DashboardStudent[];
}

// ————— Accesseurs défensifs —————

export function juryFirstName(m: JuryMember): string {
  return m.firstName ?? m.user?.firstName ?? '';
}
export function juryLastName(m: JuryMember): string {
  return m.lastName ?? m.user?.lastName ?? '';
}
export function juryRoles(m: JuryMember): Role[] {
  return m.roles ?? m.user?.roles ?? [];
}

export function rowJuryCount(r: SessionRow): number {
  return r.juryCount ?? r._count?.jury ?? 0;
}
export function rowStudentCount(r: SessionRow): number {
  return r.studentCount ?? r._count?.students ?? 0;
}

export function dashSubmitted(d: SessionDashboard | undefined): number {
  return d?.evaluationsSubmitted ?? d?.submittedEvaluations ?? 0;
}
export function dashExpected(d: SessionDashboard | undefined): number {
  return d?.expected ?? d?.expectedEvaluations ?? 0;
}
export function dashDiscrepancies(d: SessionDashboard | undefined): number {
  return d?.discrepancies ?? d?.discrepancyCount ?? 0;
}

export function dsSubmitted(s: DashboardStudent): number {
  return s.submitted ?? 0;
}
export function dsTotal(s: DashboardStudent): number {
  return s.total ?? s.expected ?? 0;
}
export function dsDiscrepancy(s: DashboardStudent): boolean {
  return Boolean(s.hasDiscrepancy ?? s.discrepancy ?? (s.discrepancyCount ?? 0) > 0);
}
export function dsFirstName(s: DashboardStudent): string {
  return s.firstName ?? s.student?.firstName ?? '';
}
export function dsLastName(s: DashboardStudent): string {
  return s.lastName ?? s.student?.lastName ?? '';
}
export function dsPostnom(s: DashboardStudent): string | null {
  return s.postnom ?? s.student?.postnom ?? null;
}
export function dsMatricule(s: DashboardStudent): string {
  return s.matricule ?? s.student?.matricule ?? '';
}

/** Statuts de session pour les onglets de filtre (CU-02). */
export const SESSION_STATUS_TABS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'PREPARATION', label: 'En préparation' },
  { value: 'OUVERTE', label: 'Ouverte' },
  { value: 'DELIBERATION', label: 'En délibération' },
  { value: 'CLOTUREE', label: 'Clôturée' },
];
