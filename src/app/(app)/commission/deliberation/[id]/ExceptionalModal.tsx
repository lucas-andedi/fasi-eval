'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import type { Criterion } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import type { ConsolidatedRow } from './_helpers';
import { studentName } from '@/lib/names';

export interface ExceptionalPayload {
  studentId: number;
  criterionId: number;
  evaluatorId: number;
  newValue: number;
  reason: string;
}

export function ExceptionalModal({
  open,
  onClose,
  students,
  saving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  students: ConsolidatedRow[];
  saving: boolean;
  onSubmit: (payload: ExceptionalPayload) => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [criterionId, setCriterionId] = useState('');
  const [evaluatorId, setEvaluatorId] = useState('');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');

  const { data: criteria } = useQuery({
    queryKey: ['reference', 'criteria'],
    queryFn: async () => (await api.get<Criterion[]>('/reference/criteria')).data,
    enabled: open,
  });

  const val = Number(newValue);
  const valid =
    studentId &&
    criterionId &&
    evaluatorId &&
    newValue !== '' &&
    !Number.isNaN(val) &&
    val >= 0 &&
    val <= 20 &&
    reason.trim().length >= 5;

  const submit = () => {
    if (!valid) return;
    onSubmit({
      studentId: Number(studentId),
      criterionId: Number(criterionId),
      evaluatorId: Number(evaluatorId),
      newValue: val,
      reason: reason.trim(),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Procédure exceptionnelle"
      description="Modification d'une note verrouillée (CU-19 · RG-28..30). Action tracée « exceptionnelle » dans le journal d'audit."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" onClick={submit} disabled={!valid} loading={saving}>
            <ShieldAlert className="h-4 w-4" /> Appliquer la modification
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-subtle" strokeWidth={1.75} />
          <span>
            Réservée aux corrections justifiées sur des notes verrouillées. La modification recalcule
            automatiquement les résultats de l'étudiant.
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Étudiant" required>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Sélectionner…</option>
              {students.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {studentName(s)} — {s.matricule}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Critère" required>
            <Select value={criterionId} onChange={(e) => setCriterionId(e.target.value)}>
              <option value="">Sélectionner…</option>
              {(criteria ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.number}. {c.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Identifiant de l'évaluateur"
            required
            hint="Identité anonymisée dans l'interface (RG-11)."
          >
            <Input
              type="number"
              min={1}
              value={evaluatorId}
              onChange={(e) => setEvaluatorId(e.target.value)}
              placeholder="ex. 42"
            />
          </Field>

          <Field label="Nouvelle note /20" required>
            <Input
              type="number"
              min={0}
              max={20}
              step="0.01"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="0,00 – 20,00"
            />
          </Field>
        </div>

        <Field label="Motif de la modification" required hint="Minimum 5 caractères — consigné au PV et à l'audit.">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Justification détaillée de la correction exceptionnelle…"
          />
        </Field>
      </div>
    </Modal>
  );
}
