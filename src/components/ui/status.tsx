import { Badge } from './Badge';
import type { DecisionType, EvaluationStatus, SessionStatus, Severity, StudentStatus } from '@/lib/types';

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const map = {
    PREPARATION: { tone: 'neutral', label: 'En préparation' },
    OUVERTE: { tone: 'teal', label: 'Ouverte' },
    DELIBERATION: { tone: 'gold', label: 'En délibération' },
    CLOTUREE: { tone: 'violet', label: 'Clôturée' },
  } as const;
  const s = map[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function EvalStatusBadge({ status }: { status: EvaluationStatus }) {
  const map = {
    BROUILLON: { tone: 'neutral', label: 'À faire' },
    VALIDEE: { tone: 'teal', label: 'Soumise' },
    VERROUILLEE: { tone: 'violet', label: 'Verrouillée' },
  } as const;
  const s = map[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function DecisionBadge({ decision }: { decision: DecisionType }) {
  const map = {
    ADMIS: { tone: 'success', label: 'Admis' },
    AJOURNE: { tone: 'danger', label: 'Ajourné' },
    COMPENSATION: { tone: 'gold', label: 'Compensation' },
  } as const;
  const s = map[decision];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return severity === 'NIVEAU_2' ? (
    <Badge tone="danger" dot>Critique</Badge>
  ) : (
    <Badge tone="warning" dot>Attention</Badge>
  );
}

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  return status === 'COMPENSATION' ? (
    <Badge tone="gold">Compensation</Badge>
  ) : (
    <Badge tone="neutral">Régulier</Badge>
  );
}
