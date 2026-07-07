import type { AxiosResponse } from 'axios';
import type {
  DecisionType,
  DefenseSession,
  Promotion,
  Severity,
  StudentStatus,
} from '@/lib/types';

// ————————————————————————————————————————————————
// Types de la vue délibération (miroir backend, ANONYMISÉ — RG-11)
// ————————————————————————————————————————————————

export interface CriterionAverage {
  criterionId: number;
  criterionLabel: string;
  average: number | null;
}

export interface Discrepancy {
  criterionId?: number;
  criterionLabel?: string;
  severity: Severity;
  spread?: number;
  note?: string;
}

export interface ConsolidatedRow {
  studentId: number;
  matricule: string;
  firstName: string;
  lastName: string;
  postnom?: string | null;
  status: StudentStatus;
  finalGrade: number | null;
  criterionAverages: CriterionAverage[];
  discrepancies: Discrepancy[];
}

export interface DecisionRow {
  studentId: number;
  decision: DecisionType;
  observation?: string | null;
  decidedAt?: string | null;
}

export interface Injunction {
  id: number;
  studentId: number;
  text: string;
  createdAt: string;
  student?: { firstName?: string; lastName?: string; postnom?: string | null; matricule?: string } | null;
}

export interface Deliberation {
  id: number;
  sessionId: number;
  status?: string | null;
  closedAt?: string | null;
  validatedAt?: string | null;
}

export interface DeliberationView {
  deliberation: Deliberation;
  decisions: DecisionRow[];
  injunctions: Injunction[];
  consolidated: {
    regular: ConsolidatedRow[];
    compensation: ConsolidatedRow[];
    session: DefenseSession;
    promotion: Promotion;
  };
}

// PV structuré (Annexe B) — forme souple, rendu défensif.
export interface ReportSectionRow {
  matricule?: string;
  name?: string;
  finalGrade?: number | null;
  decision?: DecisionType | string;
  observation?: string | null;
}
export interface ReportSection {
  title: string;
  rows: ReportSectionRow[];
}
export interface DeliberationReport {
  meta?: Record<string, unknown> & {
    title?: string;
    session?: string;
    promotion?: string;
    academicYear?: string;
    date?: string;
    room?: string;
    reference?: string;
  };
  jury?: { name?: string; role?: string }[];
  sections?: ReportSection[];
  discrepancies?: {
    matricule?: string;
    criterionLabel?: string;
    severity?: Severity | string;
    note?: string;
  }[];
  stats?: Record<string, number | string>;
}

// ————————————————————————————————————————————————
// Utilitaires
// ————————————————————————————————————————————————

export type CisnetScope = 'all' | 'regular' | 'compensation';

export const SCOPE_LABEL: Record<CisnetScope, string> = {
  all: 'Toutes les feuilles',
  regular: 'Réguliers uniquement',
  compensation: 'Compensation uniquement',
};

/** Déclenche le téléchargement d'une réponse blob (dérive le nom du Content-Disposition). */
export function downloadBlobResponse(res: AxiosResponse<Blob>, fallbackName: string) {
  const cd = (res.headers['content-disposition'] as string | undefined) ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const criticalCount = (rows: ConsolidatedRow[]): number =>
  rows.reduce(
    (acc, r) => acc + r.discrepancies.filter((d) => d.severity === 'NIVEAU_2').length,
    0,
  );

/** Rend une valeur de méta PV lisible (clé technique → libellé). */
export const META_LABELS: Record<string, string> = {
  title: 'Intitulé',
  session: 'Session',
  promotion: 'Promotion',
  academicYear: 'Année académique',
  date: 'Date',
  room: 'Salle',
  reference: 'Référence',
  president: 'Président du jury',
};
