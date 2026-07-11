'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { MessageSquareWarning, Send, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Select, Textarea } from '@/components/ui/Input';
import { EmptyState, LoadingBlock } from '@/components/ui/Feedback';
import { api, apiError } from '@/lib/api';
import { fmtDateTime } from '@/lib/utils';
import type { SessionStudent } from '../../commission/sessions/types';
import { type DeliberationView, type Injunction } from '../types';
import { studentName } from '@/lib/names';

export function InjunctionsPanel({
  sessionId,
  students,
}: {
  sessionId: number;
  students: SessionStudent[];
}) {
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState('');
  const [text, setText] = useState('');

  const delibQ = useQuery({
    queryKey: ['deliberation', sessionId],
    retry: false,
    queryFn: async () => (await api.get<DeliberationView>(`/deliberations/${sessionId}`)).data,
  });

  const injunctions: Injunction[] = delibQ.data?.injunctions ?? [];

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/deliberations/${sessionId}/injunctions`, {
          studentId: Number(studentId),
          text: text.trim(),
        })
      ).data,
    onSuccess: () => {
      toast.success('Injonction enregistrée et transmise à la commission.');
      setStudentId('');
      setText('');
      qc.invalidateQueries({ queryKey: ['deliberation', sessionId] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const studentLabel = (id: number) => {
    const s = students.find((x) => x.id === id);
    return s ? studentName(s) : `Étudiant #${id}`;
  };

  const canSubmit = studentId !== '' && text.trim().length > 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Formulaire */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-warning-line bg-warning-soft text-warning">
            <MessageSquareWarning className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Nouvelle injonction</h3>
            <p className="text-xs text-muted">Observation officielle transmise à la commission (CU-12).</p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Étudiant concerné" required>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Choisir un étudiant…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {studentName(s)} — {s.matricule}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Observation"
            required
            hint="Décrivez précisément l'observation à porter au procès-verbal."
          >
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ex. : Le jury recommande un réexamen du critère de méthodologie…"
              rows={5}
            />
          </Field>

          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => create.mutate()}
              loading={create.isPending}
              disabled={!canSubmit}
            >
              <Send className="h-4 w-4" /> Transmettre l'injonction
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Liste */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-semibold text-muted">
            Injonctions enregistrées
          </h3>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
            {injunctions.length}
          </span>
        </div>

        {delibQ.isLoading ? (
          <LoadingBlock label="Chargement…" />
        ) : injunctions.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Aucune injonction"
            description="Les observations officielles transmises apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {injunctions.map((inj, i) => (
              <motion.div
                key={inj.id ?? i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-line border-l-[3px] border-l-warning bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{studentLabel(inj.studentId)}</span>
                  {inj.createdAt && (
                    <span className="shrink-0 text-[11px] text-subtle">{fmtDateTime(inj.createdAt)}</span>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted">{inj.text}</p>
                {inj.authorName && (
                  <p className="mt-2 text-[11px] font-medium text-subtle">— {inj.authorName}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
