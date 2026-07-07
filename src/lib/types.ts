// Types partagés — miroir du modèle backend (Prisma)
export type Role = 'JURY' | 'COMMISSION' | 'ADMIN';
export type SessionStatus = 'PREPARATION' | 'OUVERTE' | 'DELIBERATION' | 'CLOTUREE';
export type EvaluationStatus = 'BROUILLON' | 'VALIDEE' | 'VERROUILLEE';
export type StudentStatus = 'REGULIER' | 'COMPENSATION';
export type DecisionType = 'ADMIS' | 'AJOURNE' | 'COMPENSATION';
export type Severity = 'NIVEAU_1' | 'NIVEAU_2';
export type TimerStateT = 'EN_ATTENTE' | 'EN_COURS' | 'SUSPENDU' | 'TERMINE';

export interface AuthUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: Role[];
  mustChangePassword: boolean;
}

export interface Promotion {
  id: number;
  code: string;
  label: string;
  defenseDurationSec: number;
  alert1Sec: number;
  alert2Sec: number;
  modificationWindowMin: number;
  stdThreshold1: number;
  stdThreshold2: number;
  absThreshold2: number;
}

export interface Criterion {
  id: number;
  number: number;
  label: string;
}

export interface Department {
  id: number;
  name: string;
  options: Option[];
}
export interface Option {
  id: number;
  name: string;
  departmentId: number;
}

export interface Student {
  id: number;
  matricule: string;
  firstName: string;
  lastName: string;
  postnom?: string | null;
  promotionId: number;
  departmentId?: number | null;
  optionId?: number | null;
  projectSubject?: string | null;
  promotion?: Promotion;
  department?: Department | null;
  option?: Option | null;
}

export interface UserRow {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: Role[];
  active: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface DefenseSession {
  id: number;
  title: string;
  promotionId: number;
  promotion?: Promotion;
  date: string;
  endDate?: string | null;
  startTime: string;
  room: string;
  status: SessionStatus;
  useCustomCriteria?: boolean;
  academicYear: string;
  defenseDurationSec: number;
  openedAt?: string | null;
  closedAt?: string | null;
  resultsPublishedAt?: string | null;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}
