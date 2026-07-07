'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Save, AlertTriangle, ScrollText, Check } from 'lucide-react';
import type { DecisionType } from '@/lib/types';
import { fmtGrade, cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DecisionBadge, SeverityBadge } from '@/components/ui/status';
import type { ConsolidatedRow, DecisionRow, Injunction } from './_helpers';
import { studentName } from '@/lib/names';

const OPTIONS: { value: DecisionType; label: string; active: string }[] = [
  { value: 'ADMIS', label: 'Admis', active: 'bg-accent text-white' },
  { value: 'AJOURNE', label: 'Ajourné', active: 'bg-danger text-white' },
  { value: 'COMPENSATION', label: 'Compensation', active: 'bg-warning text-white' },
];

export function StudentCard({
  row,
  decision,
  injunction,
  index,
  readOnly,
  saving,
  onSave,
}: {
  row: ConsolidatedRow;
  decision?: DecisionRow;
  injunction?: Injunction;
  index: number;
  readOnly: boolean;
  saving: boolean;
  onSave: (studentId: number, decision: DecisionType, observation: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<DecisionType | ''>(decision?.decision ?? '');
  const [obs, setObs] = useState(decision?.observation ?? '');

  const dirty = choice !== (decision?.decision ?? '') || obs !== (decision?.observation ?? '');
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
            <h4 className="font-display text-base font-bold text-ink">
              {studentName(row)}
            </h4>
            {decision && <DecisionBadge decision={decision.decision} />}
            {injunction && (
              <Badge tone="warning">
                <ScrollText className="h-3 w-3" /> Injonction
              </Badge>
            )}
          </div>
          <p className="mt-0.5 font-mono text-xs text-subtle">{row.matricule}</p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {row.discrepancies.map((d, i) => (
              <SeverityBadge key={i} severity={d.severity} />
            ))}
          </div>
        </div>

        {/* Note finale */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            <p className="text-[11px] font-semibold text-subtle">Note finale</p>
            <p
              className={cn(
                'font-mono text-3xl font-bold tabular',
                critical > 0 ? 'text-danger' : 'text-ink',
              )}
            >
              {fmtGrade(row.finalGrade)}
              <span className="text-base font-semibold text-subtle">/20</span>
            </p>
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:border-line-strong hover:text-ink"
            aria-label="Détails des critères"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Détail critères (anonymisé — jamais l'identité de l'évaluateur, RG-11) */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-line bg-surface"
          >
            <div className="grid gap-2 px-5 py-4 sm:grid-cols-2">
              {row.criterionAverages.length === 0 ? (
                <p className="text-sm text-subtle">Aucune moyenne de critère disponible.</p>
              ) : (
                row.criterionAverages.map((c) => (
                  <div
                    key={c.criterionId}
                    className="flex items-center justify-between rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                  >
                    <span className="truncate pr-3 text-muted">{c.criterionLabel}</span>
                    <span className="shrink-0 font-mono font-bold text-ink tabular">
                      {fmtGrade(c.average)}
                    </span>
                  </div>
                ))
              )}
            </div>
            {injunction && (
              <div className="mx-5 mb-4 flex gap-2 rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-muted">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-subtle" strokeWidth={1.75} />
                <span>
                  <span className="font-semibold">Injonction du président : </span>
                  {injunction.text}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contrôle de décision */}
      <div className="border-t border-line px-5 py-4">
        {readOnly ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Check className="h-4 w-4 text-accent" />
            {decision ? (
              <span>
                Décision arrêtée : <span className="font-semibold text-ink">{decision.decision}</span>
                {decision.observation ? ` — ${decision.observation}` : ''}
              </span>
            ) : (
              <span>Délibération verrouillée — aucune décision enregistrée.</span>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="inline-flex flex-wrap gap-1.5">
              {OPTIONS.map((o) => {
                const active = choice === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setChoice(o.value)}
                    className={cn(
                      'rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition',
                      active
                        ? cn('border-transparent', o.active)
                        : 'border-line bg-paper text-muted hover:bg-surface',
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
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
                onClick={() => choice && onSave(row.studentId, choice, obs)}
              >
                <Save className="h-4 w-4" /> Enregistrer la décision
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
